import React, { useState, useEffect } from 'react';
import * as api from '../lib/api';
import { LuTrash2, LuPlus, LuX, LuUser, LuUsers, LuDoorOpen } from "react-icons/lu";

function ManageListModal({ list, show, onClose, onManageSuccess, currentUserId }) {
    const [listName, setListName] = useState('');
    const [listType, setListType] = useState('');
    const [members, setMembers] = useState([]);
    const [newMemberUsername, setNewMemberUsername] = useState('');
    const [isUpdatingDetails, setIsUpdatingDetails] = useState(false);
    const [isAddingMember, setIsAddingMember] = useState(false);
    const [removingMemberId, setRemovingMemberId] = useState(null);
    const [isDeletingList, setIsDeletingList] = useState(false);
    const [error, setError] = useState(null);
    const [addMemberError, setAddMemberError] = useState(null);
    const [removeMemberError, setRemoveMemberError] = useState(null);
    const [deleteListError, setDeleteListError] = useState(null);

    useEffect(() => {
        if (list) {
            setListName(list.name);
            setListType(list.list_type);
            setMembers(list.members || []);
        }
    }, [list]);

    const handleClose = () => {
        setNewMemberUsername('');
        setRemovingMemberId(null);
        onClose();
    };

    const handleUpdateDetails = async (e) => {
        e.preventDefault();
        if (!listName.trim() || isUpdatingDetails) return;
        if (listName === list.name && listType === list.list_type) return;

        setIsUpdatingDetails(true);
        setError(null);
        const payload = {};
        if (listName.trim() !== list.name) payload.name = listName.trim();
        if (listType !== list.list_type) payload.list_type = listType;

        try {
            await api.updateList(list.id, payload);
            onManageSuccess();
        } catch (err) {
            console.error("Failed to update list details:", err);
            setError(`Update failed: ${err.message}`);
        } finally {
            setIsUpdatingDetails(false);
        }
    };

    const handleAddMember = async (e) => {
        e.preventDefault();
        if (!newMemberUsername.trim() || isAddingMember) return;

        setIsAddingMember(true);
        setAddMemberError(null);
        try {
            await api.addListMember(list.id, newMemberUsername.trim());
            setNewMemberUsername('');
            onManageSuccess();
        } catch (err) {
             setAddMemberError(`Failed to add member: ${err.message}`);
        } finally {
             setIsAddingMember(false);
        }
    };

    const handleRemoveMember = async (userIdToRemove, usernameToRemove) => {
        if (removingMemberId || userIdToRemove === currentUserId || userIdToRemove === list.owner.id) return;

        if (!window.confirm(`Are you sure you want to remove ${usernameToRemove} from this list?`)) return;

        setRemovingMemberId(userIdToRemove);
        setRemoveMemberError(null);
        try {
            await api.removeListMember(list.id, userIdToRemove);
            onManageSuccess();
        } catch (err) {
             setRemoveMemberError(`Failed to remove ${usernameToRemove}: ${err.message}`);
        } finally {
             setRemovingMemberId(null);
        }
    };

     const handleDeleteList = async () => {
         if (!window.confirm(`DANGER! Are you sure you want to permanently delete "${list.name}"?`)) {
             return;
         }

        setIsDeletingList(true);
        setDeleteListError(null);
        try {
            await api.deleteList(list.id);
            onManageSuccess();
        } catch (err) {
             setDeleteListError(`Failed to delete list: ${err.message}`);
        } finally {
             setIsDeletingList(false);
        }
    };

    if (!show || !list) return null;

    const isOwner = list.owner.id === currentUserId;

    return (
        <dialog id={`manage_list_modal_${list.id}`} className="modal modal-open">
            <div className="modal-box">
                <button onClick={handleClose} className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
                <h3 className="font-bold text-lg mb-4">Manage "{list.name}"</h3>

                {isOwner && (
                    <form onSubmit={handleUpdateDetails} className="mb-6 border-b border-base-300 pb-4 space-y-3">
                        <h4 className="font-semibold text-md">List Details</h4>
                         {error && <div className="text-xs text-error">{error}</div>}
                        <div className="form-control">
                            <label htmlFor={`list-name-edit-${list.id}`} className="label"><span className="label-text">List Name*</span></label>
                            <input
                                type="text"
                                id={`list-name-edit-${list.id}`}
                                value={listName}
                                onChange={(e) => setListName(e.target.value)}
                                required
                                className="input input-bordered input-sm w-full"
                                disabled={isUpdatingDetails}
                            />
                        </div>
                        <div className="form-control">
                            <label className="label"><span className="label-text">List Type*</span></label>
                            <div className="flex gap-4">
                                <label className="label cursor-pointer gap-2 text-sm">
                                    <input type="radio" name={`listTypeEdit-${list.id}`} className="radio radio-primary radio-sm" value="private" checked={listType === 'private'} onChange={() => setListType('private')} disabled={isUpdatingDetails} />
                                    <span className="flex items-center gap-1"><LuUser className="w-3 h-3" /> Private</span>
                                </label>
                                <label className="label cursor-pointer gap-2 text-sm">
                                    <input type="radio" name={`listTypeEdit-${list.id}`} className="radio radio-primary radio-sm" value="shared" checked={listType === 'shared'} onChange={() => setListType('shared')} disabled={isUpdatingDetails}/>
                                    <span className="flex items-center gap-1"><LuUsers className="w-3 h-3" /> Shared</span>
                                </label>
                            </div>
                        </div>
                        <div className="text-right">
                             <button type="submit" className="btn btn-sm btn-primary" disabled={isUpdatingDetails || (listName === list.name && listType === list.list_type)}>
                                {isUpdatingDetails ? <span className="loading loading-spinner loading-xs"></span> : null}
                                Save Changes
                             </button>
                        </div>
                    </form>
                )}

                {listType === 'shared' && (
                     <div className="mb-6 border-b border-base-300 pb-4 space-y-3">
                         <h4 className="font-semibold text-md">Members ({members.length})</h4>
                         {removeMemberError && <div className="text-xs text-error">{removeMemberError}</div>}
                         <ul className="list-disc list-inside text-sm space-y-1 max-h-32 overflow-y-auto pr-2">
                             {members.map(member => (
                                 <li key={member.user.id} className="flex justify-between items-center group">
                                     <span>
                                         {member.user.username}
                                         {member.user.id === list.owner.id && <span className="text-xs text-base-content/60"> (Owner)</span>}
                                         {member.user.id === currentUserId && member.user.id !== list.owner.id && <span className="text-xs text-info/80"> (You)</span>}
                                     </span>
                                      {isOwner && member.user.id !== list.owner.id && (
                                         <button
                                             onClick={() => handleRemoveMember(member.user.id, member.user.username)}
                                             className="btn btn-xs btn-ghost text-error opacity-0 group-hover:opacity-100 transition-opacity"
                                             disabled={removingMemberId === member.user.id}
                                             title={`Remove ${member.user.username}`}
                                         >
                                             {removingMemberId === member.user.id ? <span className="loading loading-spinner loading-xs"></span> : <LuX className="w-3 h-3" />}
                                         </button>
                                     )}
                                 </li>
                             ))}
                         </ul>

                         {isOwner && (
                            <form onSubmit={handleAddMember} className="flex items-end gap-2 pt-2">
                                <div className="form-control flex-grow">
                                     <label htmlFor={`add-member-user-${list.id}`} className="label py-0"><span className="label-text text-xs">Add Member by Username</span></label>
                                    <input
                                        type="text"
                                        id={`add-member-user-${list.id}`}
                                        value={newMemberUsername}
                                        onChange={(e) => { setNewMemberUsername(e.target.value); setAddMemberError(null); }}
                                        placeholder="Username"
                                        className={`input input-bordered input-sm w-full ${addMemberError ? 'input-error' : ''}`}
                                        disabled={isAddingMember}
                                    />
                                     {addMemberError && <div className="text-xs text-error mt-1">{addMemberError}</div>}
                                </div>
                                <button type="submit" className="btn btn-sm btn-secondary" disabled={isAddingMember || !newMemberUsername.trim()}>
                                     {isAddingMember ? <span className="loading loading-spinner loading-xs"></span> : <LuPlus className="w-4 h-4"/>}
                                    Add
                                </button>
                            </form>
                         )}
                     </div>
                )}

                 {isOwner && (
                     <div className="space-y-2">
                         <h4 className="font-semibold text-md text-error">Danger Zone</h4>
                          {deleteListError && <div className="text-xs text-error">{deleteListError}</div>}
                         <p className="text-xs text-warning">Deleting this list is permanent and will remove all associated categories and items.</p>
                          <button
                            onClick={handleDeleteList}
                            className="btn btn-sm btn-error btn-outline w-full"
                            disabled={isDeletingList}
                           >
                             {isDeletingList ? <span className="loading loading-spinner loading-xs"></span> : <LuTrash2 className="w-4 h-4"/>}
                             Delete This List Permanently
                         </button>
                     </div>
                 )}

                <div className="modal-action mt-6">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="btn btn-ghost"
                    >
                        Close
                    </button>
                </div>
            </div>
             <form method="dialog" className="modal-backdrop">
                <button onClick={handleClose}>close</button>
             </form>
        </dialog>
    );
}

export default ManageListModal;
