
'use client'
import { auth, db, storage } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ThemeToggle from './ThemeToggle';
import { LogOut, Save, User, Image, ToggleRight, ToggleLeft, X } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function Profile() {
  const [username, setUsername] = useState('');
  const [profilePic, setProfilePic] = useState<File | null>(null);
  const [activeStatus, setActiveStatus] = useState(true); // Default to active
  const router = useRouter();

  useEffect(() => {
    if (auth.currentUser) {
      setUsername(auth.currentUser.displayName || '');
      // Fetch active status if it exists in user document
      const fetchUserProfile = async () => {
        const userDocRef = doc(db, 'users', auth.currentUser!.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setUsername(userData.displayName || '');
          setActiveStatus(userData.activeStatus ?? true);
        } else {
          setUsername(auth.currentUser.displayName || '');
          setActiveStatus(true); // Default if no user document exists
        }
      };
      fetchUserProfile();
    }
  }, [auth.currentUser]);

  const handleProfileSetup = async () => {
    if (auth.currentUser) {
      try {
        // Check for username uniqueness
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('displayName', '==', username));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty && querySnapshot.docs[0].id !== auth.currentUser.uid) {
          alert('This username is already taken. Please choose another.');
          return;
        }

        const userRef = doc(db, 'users', auth.currentUser.uid);
        let profilePicUrl = auth.currentUser.photoURL;

        if (profilePic) {
          const formData = new FormData();
          formData.append('profilePic', profilePic);

          const response = await fetch('http://localhost:3001/upload-profile-pic', {
            method: 'POST',
            headers: {
              'x-user-id': auth.currentUser.uid, // Send UID for filename
            },
            body: formData,
          });

          if (!response.ok) {
            throw new Error('Failed to upload profile picture.');
          }
          const data = await response.json();
          profilePicUrl = `http://localhost:3001${data.url}`; // Construct full URL
        }

        await setDoc(userRef, {
          uid: auth.currentUser.uid,
          displayName: username || auth.currentUser.displayName,
          photoURL: profilePicUrl,
          activeStatus: activeStatus, // Save active status
        }, { merge: true });

        // Update Firebase Auth profile
        await updateProfile(auth.currentUser, {
          displayName: username || auth.currentUser.displayName,
          photoURL: profilePicUrl,
        });
        alert('Profile updated successfully!');
        router.push('/');
      } catch (error: any) {
        console.error(error);
        alert(`Error updating profile: ${error.message}`);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-400 dark:from-gray-800 dark:to-black p-4">
      <div className="relative bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md transform transition-all duration-300 hover:scale-105 border border-gray-200 dark:border-gray-700 backdrop-filter backdrop-blur-lg bg-opacity-80 dark:bg-opacity-80">
        <div className="absolute top-4 right-4 flex items-center space-x-2">
          <button 
            onClick={() => router.push('/')} 
            className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X size={24} />
          </button>
        </div>
        <h2 className="text-3xl font-extrabold text-gray-800 dark:text-white mb-6 text-center animate-fade-in">Set up your profile</h2>
        
        <div className="mb-4">
          <label htmlFor="username" className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
            <User className="inline-block mr-2" size={18} />Username:
          </label>
          <input 
            type="text" 
            id="username"
            placeholder="Enter your username" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-200 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:shadow-outline bg-gray-50 dark:bg-gray-700 transition duration-300 ease-in-out"
          />
        </div>
        
        <div className="mb-6">
          <label htmlFor="profilePic" className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
            <Image className="inline-block mr-2" size={18} />Profile Picture:
          </label>
          <input 
            type="file" 
            id="profilePic"
            onChange={(e) => setProfilePic(e.target.files ? e.target.files[0] : null)} 
            className="block w-full text-sm text-gray-500 dark:text-gray-400
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 dark:file:bg-blue-900 file:text-blue-700 dark:file:text-blue-300
              hover:file:bg-blue-100 dark:hover:file:bg-blue-800 transition duration-300 ease-in-out"
          />
        </div>

        <div className="mb-6 flex items-center justify-between">
          <label htmlFor="activeStatus" className="block text-gray-700 dark:text-gray-300 text-sm font-bold">
            Active Status:
          </label>
          <button
            onClick={() => setActiveStatus(!activeStatus)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
              ${activeStatus ? 'bg-green-500' : 'bg-gray-300'}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                ${activeStatus ? 'translate-x-6' : 'translate-x-1'}`}
            />
          </button>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0 sm:space-x-4">
          <button 
            onClick={handleProfileSetup} 
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-300 ease-in-out transform hover:scale-105 flex items-center justify-center"
          >
            <Save className="inline-block mr-2" size={20} />Save Profile
          </button>
          <button 
            onClick={() => auth.signOut()} 
            className="w-full sm:w-auto bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition duration-300 ease-in-out transform hover:scale-105 flex items-center justify-center"
          >
            <LogOut className="inline-block mr-2" size={20} />Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
