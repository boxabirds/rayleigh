import React, { useState } from 'react';
import { TrashIcon } from '@heroicons/react/24/outline';

interface Community {
  id: string;
  name: string;
  description: string;
  creatorDid: string;
}

interface DeleteModalProps {
  community: Community;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

const DeleteModal: React.FC<DeleteModalProps> = ({ community, onClose, onConfirm }) => {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Error deleting community:', error);
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold text-red-600 mb-4">Delete Community</h2>
        <p className="mb-4">
          This action cannot be undone. This will permanently delete the community
          <span className="font-bold"> {community.name}</span> and all associated data.
        </p>
        <p className="mb-4">
          Please type <span className="font-bold">{community.name}</span> to confirm.
        </p>
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          className="w-full px-3 py-2 border rounded-md mb-4"
          placeholder="Type community name to confirm"
        />
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={confirmText !== community.name || isDeleting}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            {isDeleting ? 'Deleting...' : 'Delete Community'}
          </button>
        </div>
      </div>
    </div>
  );
};

interface CommunityListProps {
  communities: Community[];
  currentUserDid: string;
  onDeleteCommunity: (communityId: string) => Promise<void>;
}

export const CommunityList: React.FC<CommunityListProps> = ({
  communities,
  currentUserDid,
  onDeleteCommunity,
}) => {
  const [communityToDelete, setCommunityToDelete] = useState<Community | null>(null);

  return (
    <div className="space-y-4">
      {communities.map((community) => (
        <div
          key={community.id}
          className="bg-white p-4 rounded-lg shadow-sm border hover:shadow-md transition-shadow"
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold">{community.name}</h3>
              <p className="text-gray-600">{community.description}</p>
            </div>
            {community.creatorDid === currentUserDid && (
              <button
                onClick={() => setCommunityToDelete(community)}
                className="text-gray-400 hover:text-red-600 p-2"
                aria-label="Delete community"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      ))}

      {communityToDelete && (
        <DeleteModal
          community={communityToDelete}
          onClose={() => setCommunityToDelete(null)}
          onConfirm={() => onDeleteCommunity(communityToDelete.id)}
        />
      )}
    </div>
  );
};
