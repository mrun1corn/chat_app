
'use client'
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';
import ThemeToggle from './ThemeToggle';

export default function Auth() {

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error(error);
      alert(`Error signing in with Google: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 to-purple-600 dark:from-gray-800 dark:to-black p-4">
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      <div className="relative bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl text-center transform transition-all duration-300 hover:scale-105 border border-gray-200 dark:border-gray-700 backdrop-filter backdrop-blur-lg bg-opacity-80 dark:bg-opacity-80">
        
        <h2 className="text-3xl font-extrabold text-gray-800 dark:text-white mb-6 animate-fade-in">Welcome to Chat App</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-8 text-lg animate-fade-in animation-delay-200">Sign in to connect with your friends!</p>
        <button 
          onClick={handleGoogleSignIn} 
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-full focus:outline-none focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800 transition duration-300 ease-in-out transform hover:scale-110 flex items-center justify-center mx-auto animate-bounce-in"
        >
          <img src="/google-icon.svg" alt="Google Icon" className="w-6 h-6 mr-3" />
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
