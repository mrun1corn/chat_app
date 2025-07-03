
'use client'
import { useState, useEffect, useRef } from 'react';
import { auth, db } from '../firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, getDoc, where } from 'firebase/firestore';
import { sendConnectionRequest, acceptConnectionRequest, rejectConnectionRequest, getPendingRequests, getConnections, searchUsers } from '../connections';
import { getUserProfile } from '../utils/userUtils';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useRouter } from 'next/navigation';
import { Search, UserPlus, Check, X, Menu, MessageSquare, LogOut, ChevronLeft, ChevronRight, Send, User, Circle } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import Image from 'next/image';

export default function Chat() {
  const [user] = useAuthState(auth);
  const router = useRouter();
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // State for sidebar visibility
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  const toggleSearch = () => {
    setIsSearchVisible(prev => {
      if (prev) { // If search was visible, clear search term and results
        setSearchTerm('');
        setSearchResults([]);
      }
      return !prev;
    });
  };
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  useEffect(() => {
    if (!user) return;

    const fetchConnectionsAndRequests = async () => {
      const fetchedPendingRequests = await getPendingRequests(user.uid);
      const pendingRequestsWithNames = await Promise.all(
        fetchedPendingRequests.map(async (req: any) => {
          const fromUserProfile = await getUserProfile(req.fromUid);
          return { ...req, fromDisplayName: fromUserProfile?.displayName || 'Unknown User' };
        })
      );
      setPendingRequests(pendingRequestsWithNames);

      const fetchedConnections = await getConnections(user.uid);
      const connectionsWithNames = await Promise.all(
        fetchedConnections.map(async (conn: any) => {
          const otherUid = conn.user1Uid === user.uid ? conn.user2Uid : conn.user1Uid;
          const otherUserProfile = await getUserProfile(otherUid);
          return { ...conn, otherUserDisplayName: otherUserProfile?.displayName || 'Unknown User' };
        })
      );
      setConnections(connectionsWithNames);
    };

    const fetchCurrentUserProfile = async () => {
      if (user) {
        const profile = await getUserProfile(user.uid);
        setCurrentUserProfile(profile);
      }
    };

    fetchConnectionsAndRequests();
    fetchCurrentUserProfile();

    // Real-time listeners for requests and connections
    const unsubscribeRequests = onSnapshot(query(collection(db, 'connectionRequests'), where('toUid', '==', user.uid), where('status', '==', 'pending')), async (snapshot) => {
      const pendingRequestsWithNames = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const req = { id: doc.id, ...doc.data() };
          const fromUserProfile = await getUserProfile(req.fromUid);
          return { ...req, fromDisplayName: fromUserProfile?.displayName || 'Unknown User' };
        })
      );
      setPendingRequests(pendingRequestsWithNames);
    });

    const unsubscribeConnections = onSnapshot(query(collection(db, 'connections'), where('user1Uid', '==', user.uid)), async (snapshot) => {
      const connectionsWithNames = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const conn = { id: doc.id, ...doc.data() };
          const otherUid = conn.user1Uid === user.uid ? conn.user2Uid : conn.user1Uid;
          const otherUserProfile = await getUserProfile(otherUid);
          return { ...conn, otherUserDisplayName: otherUserProfile?.displayName || 'Unknown User' };
        })
      );
      setConnections(prev => {
        const newConnections = connectionsWithNames;
        return [...new Set([...prev, ...newConnections])];
      });
    });

    const unsubscribeConnections2 = onSnapshot(query(collection(db, 'connections'), where('user2Uid', '==', user.uid)), async (snapshot) => {
      const connectionsWithNames = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const conn = { id: doc.id, ...doc.data() };
          const otherUid = conn.user1Uid === user.uid ? conn.user2Uid : conn.user1Uid;
          const otherUserProfile = await getUserProfile(otherUid);
          return { ...conn, otherUserDisplayName: otherUserProfile?.displayName || 'Unknown User' };
        })
      );
      setConnections(prev => {
        const newConnections = connectionsWithNames;
        return [...new Set([...prev, ...newConnections])];
      });
    });

    return () => {
      unsubscribeRequests();
      unsubscribeConnections();
      unsubscribeConnections2();
    };
  }, [user]);

  useEffect(() => {
    if (!selectedChat) return;

    const messagesQuery = query(
      collection(db, 'messages'),
      where('chatId', '==', selectedChat.chatId),
      orderBy('createdAt')
    );

    const unsubscribeMessages = onSnapshot(messagesQuery, async (querySnapshot) => {
      const fetchedMessages: any[] = [];
      const userPromises: Promise<any>[] = [];
      const usersMap = new Map();

      querySnapshot.forEach((doc) => {
        const messageData = doc.data();
        fetchedMessages.push({ ...messageData, id: doc.id });
        if (messageData.uid && !usersMap.has(messageData.uid)) {
          usersMap.set(messageData.uid, null); // Placeholder to avoid duplicate fetches
          userPromises.push(getDoc(doc(db, 'users', messageData.uid)));
        }
      });

      const userDocs = await Promise.all(userPromises);
      userDocs.forEach(userDoc => {
        if (userDoc.exists()) {
          usersMap.set(userDoc.id, userDoc.data());
        }
      });

      const messagesWithUserData = fetchedMessages.map(msg => {
        const userData = usersMap.get(msg.uid);
        return {
          ...msg,
          displayName: userData?.displayName || msg.displayName,
          photoURL: userData?.photoURL || msg.photoURL,
        };
      });

      setMessages(messagesWithUserData);
    });

    return () => unsubscribeMessages();
  }, [selectedChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isSearchVisible && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchVisible]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '' || !user || !selectedChat) return;
    if (!user.displayName) {
      alert('Please set up your profile (username and photo) before sending messages.');
      return;
    }

    await addDoc(collection(db, 'messages'), {
      chatId: selectedChat.chatId,
      text: newMessage,
      createdAt: serverTimestamp(),
      uid: user.uid,
      displayName: user.displayName,
      photoURL: user.photoURL,
    });

    setNewMessage('');
  };

  const handleSearch = async () => {
    if (searchTerm.trim() === '') return;
    const results = await searchUsers(searchTerm);
    setSearchResults(results.filter((u: any) => u.id !== user?.uid));
  };

  const handleSendRequest = async (toUid: string) => {
    if (!user) return;
    const result = await sendConnectionRequest(user.uid, toUid);
    if (result.success) {
      alert('Connection request sent!');
    } else {
      alert(`Failed to send request: ${result.error}`);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    const result = await acceptConnectionRequest(requestId);
    if (result.success) {
      alert('Connection request accepted!');
    } else {
      alert(`Failed to accept request: ${result.error}`);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    const result = await rejectConnectionRequest(requestId);
    if (result.success) {
      alert('Connection request rejected!');
    } else {
      alert(`Failed to reject request: ${result.error}`);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden" 
          onClick={toggleSidebar}
        ></div>
      )}

      {/* Sidebar */}
      <div 
        className={`fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col z-40 
          transform transition-transform duration-300 ease-in-out 
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
          lg:relative lg:translate-x-0 lg:w-1/4 lg:max-w-xs lg:flex`}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-primary dark:text-secondary">Chat App</h2>
          <ThemeToggle />
          <button onClick={toggleSidebar} className="lg:hidden p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
            <X size={24} />
          </button>
        </div>

        

        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-3 flex items-center"><MessageSquare size={18} className="mr-2" />Pending Requests</h3>
          <div className="space-y-2">
            {pendingRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between p-2 bg-yellow-50 dark:bg-yellow-900 rounded-md shadow-sm border border-yellow-200 dark:border-yellow-700">
                <p className="font-medium text-yellow-800 dark:text-yellow-200">{request.fromDisplayName}</p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleAcceptRequest(request.id)}
                    className="bg-green-500 hover:bg-green-600 text-white text-sm py-1 px-3 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 flex items-center"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={() => handleRejectRequest(request.id)}
                    className="bg-red-500 hover:bg-red-600 text-white text-sm py-1 px-3 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 flex items-center"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
          <h3 className="text-lg font-semibold mb-3 flex items-center"><MessageSquare size={18} className="mr-2" />Connections</h3>
          <div className="space-y-2">
            {connections.map((connection) => (
              <div 
                key={connection.id} 
                className={`flex items-center p-3 rounded-md shadow-sm cursor-pointer transition-colors duration-200 
                  ${selectedChat?.chatId === connection.id ? 'bg-blue-100 dark:bg-blue-700' : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'}`}
                onClick={() => setSelectedChat({ chatId: connection.id, otherUserUid: connection.user1Uid === user?.uid ? connection.user2Uid : connection.user1Uid, otherUserDisplayName: connection.otherUserDisplayName })}
              >
                <Image 
                  src={connection.otherUserProfile?.photoURL || '/default-avatar.png'} 
                  alt="Profile" 
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-full mr-3 object-cover border-2 border-blue-400 dark:border-blue-600" 
                />
                <p className="font-medium">{connection.otherUserDisplayName}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-background dark:bg-gray-900 transition-colors duration-300">
        <header className="bg-primary dark:bg-gray-800 text-white p-4 shadow-md flex justify-between items-center relative z-20">
          <div className="flex items-center">
            <button onClick={toggleSidebar} className="lg:hidden p-2 rounded-md text-white hover:bg-blue-700 dark:hover:bg-gray-700 mr-2">
              <Menu size={24} />
            </button>
            <h1 className="text-2xl font-bold flex-1 text-center">
            {selectedChat ? (
              selectedChat.otherUserDisplayName
            ) : (
              <div className="flex items-center justify-center">
                <span>{currentUserProfile?.displayName || 'Chat App'}</span>
                {currentUserProfile?.activeStatus && (
                  <Circle size={16} fill="green" stroke="green" className="ml-2" />
                )}
              </div>
            )}
          </h1>
          </div>

          <div className="flex items-center space-x-2">
            <div className="relative flex items-center">
              <button onClick={toggleSearch} className="p-2 rounded-md text-white hover:bg-blue-700 dark:hover:bg-gray-700 lg:hidden">
                <Search size={24} />
              </button>
              <input
                type="text"
                placeholder="Search users..."
                ref={searchInputRef}
                className={`p-2 rounded-lg text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
                  ${isSearchVisible ? 'block' : 'hidden'} lg:block`}
              />
              <button
                onClick={handleSearch}
                className={`ml-2 p-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white
                  ${isSearchVisible ? 'block' : 'hidden'} lg:block`}
              >
                <Search size={20} />
              </button>
            </div>

            {user && (
              <>
                <button 
                  onClick={() => router.push('/profile')} 
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 flex items-center"
                >
                  <User size={18} className="mr-1" /><span className="hidden lg:inline">Edit Profile</span>
                </button>
                <button 
                  onClick={() => auth.signOut()} 
                  className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 flex items-center"
                >
                  <LogOut size={18} className="mr-1" /><span className="hidden lg:inline">Sign Out</span>
                </button>
              </>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-gradient-to-br from-blue-50 dark:from-gray-800 to-purple-50 dark:to-gray-900">
          {selectedChat ? (
            messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex items-start ${msg.uid === user?.uid ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-center space-x-3 ${msg.uid === user?.uid ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  {msg.photoURL && (
                    <Image 
                      src={msg.photoURL} 
                      alt="Profile" 
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-full border-2 border-blue-400 dark:border-blue-600 object-cover shadow-md" 
                    />
                  )}
                  <div 
                    className={`p-4 rounded-xl shadow-lg max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg break-words relative 
                      ${msg.uid === user?.uid 
                        ? 'bg-blue-500 text-white rounded-br-none animate-slide-in-right' 
                        : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-bl-none animate-slide-in-left'
                      }`}
                  >
                    <p className="font-semibold text-sm mb-1">{msg.displayName}</p>
                    <p className="text-base">{msg.text}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-lg flex-col">
              <MessageSquare size={64} className="mb-4 text-gray-400 dark:text-gray-600" />
              <p>Select a connection to start chatting.</p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </main>

        {selectedChat && (
          <form onSubmit={sendMessage} className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg flex items-center space-x-3 transition-colors duration-300">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition duration-300 ease-in-out"
            />
            <button 
              type="submit" 
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 flex items-center justify-center"
            >
              <Send size={20} />
            </button>
          </form>
        )}
      </div>

      {/* Search Results Overlay */}
      {isSearchVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md relative">
            <button onClick={toggleSearch} className="absolute top-3 right-3 p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
              <X size={24} />
            </button>
            <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Search Results</h3>
            <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
              {searchResults.length > 0 ? (
                searchResults.map((result) => (
                  <div key={result.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-md shadow-sm hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{result.displayName}</p>
                    <button
                      onClick={() => handleSendRequest(result.id)}
                      className="bg-green-500 hover:bg-green-600 text-white text-sm py-1 px-3 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 flex items-center"
                    >
                      <UserPlus size={16} className="mr-1" />Connect
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 dark:text-gray-400">No users found.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
