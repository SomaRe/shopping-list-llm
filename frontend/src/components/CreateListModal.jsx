import React, { useState } from 'react';
import * as api from '../lib/api';
import { LuDoorOpen, LuUser, LuUsers } from 'react-icons/lu';

function CreateListModal({ show, onClose, onCreateSuccess }) {
    const [listName, setListName] = useState('');
    const [listType, setListType] = useState('private');
    const [shareUsernames, setShareUsernames] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const resetForm = () => {
        setListName('');
        setListType('private');
        setShareUsernames('');
        setError(null);
        setIsLoading(false);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!listName.trim() || isLoading) return;

        setIsLoading(true);
        setError(null);

        const usernamesToShare = shareUsernames.split(',')
                                 .map(u => u.trim())
                                 .filter(u => u);

        const payload = {
            name: listName.trim(),
            list_type: listType,
            share_with_usernames: usernamesToShare.length > 0 ? usernamesToShare : undefined,
        };

        try {
            await api.createList(payload);
            resetForm();
            onCreateSuccess();
        } catch (err) {
            console.error("Failed to create list:", err);
            setError(err.message || "An error occurred while creating the list.");
            setIsLoading(false);
        }
    };

    if (!show) return null;

    return (
        <dialog id="create_list_modal" className="modal modal-open">
            <div className="modal-box">
                <button onClick={handleClose} className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
                <h3 className="font-bold text-lg mb-4">Create New Shopping List</h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="alert alert-error text-sm p-2">
                           <span>{error}</span>
                        </div>
                     )}

                    <div className="form-control">
                        <label htmlFor="list-name" className="label">
                            <span className="label-text">List Name*</span>
                        </label>
                        <input
                            type="text"
                            id="list-name"
                            value={listName}
                            onChange={(e) => setListName(e.target.value)}
                            required
                            className="input input-bordered w-full"
                            disabled={isLoading}
                        />
                    </div>

                    <div className="form-control">
                        <label className="label"><span className="label-text">List Type*</span></label>
                        <div className="flex gap-4">
                             <label className="label cursor-pointer gap-2">
                                <input type="radio" name="listType" className="radio radio-primary" value="private" checked={listType === 'private'} onChange={() => setListType('private')} disabled={isLoading} />
                                <span className="label-text flex items-center gap-1"><LuUser className="w-4 h-4" /> Private</span>
                             </label>
                             <label className="label cursor-pointer gap-2">
                                <input type="radio" name="listType" className="radio radio-primary" value="shared" checked={listType === 'shared'} onChange={() => setListType('shared')} disabled={isLoading}/>
                                <span className="label-text flex items-center gap-1"><LuUsers className="w-4 h-4" /> Shared</span>
                             </label>
                        </div>
                    </div>

                     {listType === 'shared' && (
                        <div className="form-control">
                             <label htmlFor="share-usernames" className="label">
                                <span className="label-text">Share Initially With (Optional)</span>
                             </label>
                            <input
                                type="text"
                                id="share-usernames"
                                value={shareUsernames}
                                onChange={(e) => setShareUsernames(e.target.value)}
                                placeholder="Enter usernames, comma-separated"
                                className="input input-bordered w-full input-sm"
                                disabled={isLoading}
                            />
                             <div className="label">
                                <span className="label-text-alt">e.g., user2, another_user</span>
                             </div>
                        </div>
                     )}

                    <div className="modal-action mt-6">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="btn btn-ghost"
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || !listName.trim()}
                            className="btn btn-primary"
                        >
                            {isLoading ? <> <span className="loading loading-spinner loading-xs"></span> Creating... </> : 'Create List'}
                        </button>
                    </div>
                </form>
            </div>
             <form method="dialog" className="modal-backdrop">
                <button onClick={handleClose}>close</button>
             </form>
        </dialog>
    );
}

export default CreateListModal;
