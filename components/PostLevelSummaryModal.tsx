

import React from 'react';
import { PostLevelSummaryModalProps } from '../types'; // vocabulary prop type will be string[] now
import Modal from './Modal'; 

const StarRating: React.FC<{ rating: number }> = ({ rating }) => {
  return (
    <div className="flex justify-center mb-3">
      {[1, 2, 3].map((star) => (
        <svg
          key={star}
          className={`w-8 h-8 sm:w-10 sm:h-10 ${star <= rating ? 'text-yellow-400' : 'text-gray-500'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
};

const PostLevelSummaryModal: React.FC<PostLevelSummaryModalProps> = ({
  isOpen,
  onClose,
  stars,
  feedback,
  vocabulary, 
  nextWingName,
  currentWingName,
}) => {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} title={`Wing Complete: ${currentWingName}!`} onClose={onClose}>
      <div className="text-center">
        <StarRating rating={stars} />
        
        <div className="my-4 p-3 bg-gray-700 rounded-md shadow">
          <h3 className="text-lg font-semibold text-purple-300 mb-1">Curator's Feedback:</h3>
          <p className="text-sm text-gray-300 italic whitespace-pre-wrap">{feedback || "Well done!"}</p>
        </div>

        {vocabulary.length > 0 && (
          <div className="my-4 p-3 bg-gray-700 rounded-md shadow">
            <h3 className="text-lg font-semibold text-purple-300 mb-2">Key Descriptive Language Used:</h3>
            <div className="max-h-32 overflow-y-auto narrative-scrollbar pr-2 text-left">
              <ul className="list-disc list-inside text-sm text-gray-300">
                {vocabulary.map((term, index) => (
                  <li key={index} className="text-pink-300">{term}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {nextWingName && (
          <p className="text-md text-green-400 my-3">
            Next Unlocked: <span className="font-semibold">{nextWingName}</span>
          </p>
        )}
         {!nextWingName && (
            <p className="text-md text-yellow-300 my-3">
            All wings explored! The final challenge awaits if not yet completed.
            </p>
        )}

        <button
          onClick={onClose}
          className="mt-4 w-full px-6 py-3 bg-pink-500 hover:bg-pink-600 text-white font-semibold rounded-lg shadow-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-pink-400"
          aria-label="Return to Gallery Map"
        >
          Return to Gallery Map
        </button>
      </div>
    </Modal>
  );
};

export default PostLevelSummaryModal;