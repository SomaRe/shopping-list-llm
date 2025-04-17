import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import * as api from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import CreateListModal from '../components/CreateListModal';
import ManageListModal from '../components/ManageListModal';
import { LuCirclePlus , LuSettings, LuTrash2, LuLogOut, LuUsers, LuUser, LuEye, LuDoorOpen } from "react-icons/lu";

const LoadingSpinner = () => (
    <div className="text-center py-10">
        <p className="text-base-content/70 mb-2">Loading your lists...</p>
        <span className="loading loading-spinner loading-lg text-primary"></span>
    </div>
);

function ShoppingListsPage() {
    const [lists, setLists] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showManageModal, setShowManageModal] = useState(false);
    const [selectedList, setSelectedList] = useState(null);

    const { user, logout } = useAuth();
    // const navigate = useNavigate();

    const fetchUserLists = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const fetchedLists = await api.fetchLists();
            fetchedLists.sort((a, b) => a.name.localeCompare(b.name));
            setLists(fetchedLists);
        } catch (err) {
            console.error("Failed to fetch lists:", err);
            setError(err.message || "Could not fetch shopping lists.");
            if (err.message?.includes('401')) logout();
        } finally {
            setIsLoading(false);
        }
    }, [logout]);

    useEffect(() => {
        fetchUserLists();
    }, [fetchUserLists]);

    const handleCreateSuccess = () => {
        setShowCreateModal(false);
        fetchUserLists();
    };

    const handleManageSuccess = () => {
        setShowManageModal(false);
        setSelectedList(null);
        fetchUserLists();
    };

    const openManageModal = (list) => {
        setSelectedList(list);
        setShowManageModal(true);
    };

    // const handleDeleteList = async (listId, listName) => {
    //      if (!window.confirm(`Are you sure you want to permanently delete the list "${listName}"?`)) {
    //          return;
    //      }
    //      setIsLoading(true);
    //      try {
    //          await api.deleteList(listId);
    //          fetchUserLists();
    //      } catch (err) {
    //          console.error("Failed to delete list:", err);
    //          setError(`Failed to delete list: ${err.message}`);
    //          if (err.message?.includes('401')) logout();
    //          setIsLoading(false);
    //      }
    //  };

    return (
        <div className="container mx-auto p-4 min-h-screen">
            <header className="flex justify-between items-center mb-6 pb-2 border-b border-base-300">
                <h1 className="text-2xl font-bold text-base-content">Your Shopping Lists</h1>
                <div className="flex items-center gap-4">
                     {user && (
                        <span className="text-sm text-base-content/80 font-semibold hidden sm:inline">
                            Welcome, {user.username}!
                        </span>
                    )}
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="btn btn-sm btn-primary"
                        title="Create New List"
                    >
                       <LuCirclePlus  className="w-4 h-4"/> New List
                    </button>
                    <button
                        onClick={logout}
                        className="btn btn-sm btn-outline btn-error"
                        title="Logout"
                    >
                        <LuLogOut className="w-4 h-4"/>
                    </button>
                </div>
            </header>

            {isLoading && <LoadingSpinner />}

            {error && (
                <div className="alert alert-error shadow-lg mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span>Error: {error}</span>
                     <button className="btn btn-sm btn-ghost" onClick={fetchUserLists}>Retry</button>
                </div>
            )}

            {!isLoading && !error && lists.length === 0 && (
                <div className="text-center py-10 card bg-base-100 shadow">
                    <div className="card-body items-center">
                        <p className="text-xl text-base-content/70">No lists found.</p>
                        <p className="text-sm text-base-content/50">Create your first shopping list to get started!</p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="btn btn-primary mt-4"
                        >
                            <LuCirclePlus  className="w-4 h-4"/> Create List
                        </button>
                    </div>
                </div>
            )}

            {!isLoading && !error && lists.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {lists.map((list) => (
                        <div key={list.id} className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow">
                            <div className="card-body p-5">
                                <div className="flex justify-between items-start mb-2">
                                    <h2 className="card-title text-lg font-semibold">{list.name}</h2>
                                    <span className={`badge ${list.list_type === 'shared' ? 'badge-info' : 'badge-ghost'} badge-sm flex items-center gap-1`}>
                                         {list.list_type === 'shared' ? <LuUsers className="w-3 h-3"/> : <LuUser className="w-3 h-3"/>}
                                        {list.list_type}
                                    </span>
                                </div>
                                <p className="text-xs text-base-content/60 mb-1">
                                    Owned by: {list.owner.id === user.id ? 'You' : list.owner.username}
                                </p>
                                <p className="text-xs text-base-content/60 mb-3">
                                     Members: {list.members.length} ({list.members.map(m => m.user.username).join(', ')})
                                </p>
                                <div className="card-actions justify-end items-center gap-1">
                                    <Link to={`/lists/${list.id}`} className="btn btn-sm btn-outline btn-primary" title="View List">
                                        <LuEye className="w-4 h-4"/> View
                                    </Link>


                                    {list.owner.id === user.id ? (
                                        <>
                                            <button
                                                onClick={() => openManageModal(list)}
                                                className="btn btn-sm btn-outline btn-secondary"
                                                title="Manage List & Members"
                                            >
                                                <LuSettings className="w-4 h-4"/> Manage
                                            </button>
                                        </>
                                    ) : (
                                         <button
                                            onClick={() => alert('Leave list functionality coming soon')}
                                            className="btn btn-sm btn-outline btn-warning"
                                            title="Leave List"
                                            disabled
                                        >
                                             <LuDoorOpen className="w-4 h-4"/> Leave
                                         </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <CreateListModal
                show={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onCreateSuccess={handleCreateSuccess}
            />

            {selectedList && (
                 <ManageListModal
                    key={selectedList.id}
                    list={selectedList}
                    show={showManageModal}
                    onClose={() => { setShowManageModal(false); setSelectedList(null); }}
                    onManageSuccess={handleManageSuccess}
                    currentUserId={user.id}
                />
            )}
        </div>
    );
}

export default ShoppingListsPage;
