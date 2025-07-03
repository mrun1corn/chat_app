import { db } from './firebase';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, serverTimestamp, deleteDoc } from 'firebase/firestore';

export const sendConnectionRequest = async (fromUid: string, toUid: string, initialMessage: string = '') => {
  try {
    // Check if a request already exists
    const existingRequestsQuery = query(
      collection(db, 'connectionRequests'),
      where('fromUid', 'in', [fromUid, toUid]),
      where('toUid', 'in', [fromUid, toUid])
    );
    const existingRequestsSnapshot = await getDocs(existingRequestsQuery);

    if (!existingRequestsSnapshot.empty) {
      const existingRequest = existingRequestsSnapshot.docs[0].data();
      if (existingRequest.status === 'pending') {
        throw new Error('A pending request already exists between these users.');
      } else if (existingRequest.status === 'accepted') {
        throw new Error('Users are already connected.');
      }
    }

    await addDoc(collection(db, 'connectionRequests'), {
      fromUid,
      toUid,
      status: 'pending',
      initialMessage,
      createdAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error: any) {
    console.error('Error sending connection request:', error);
    return { success: false, error: error.message };
  }
};

export const acceptConnectionRequest = async (requestId: string) => {
  try {
    const requestRef = doc(db, 'connectionRequests', requestId);
    const requestSnap = await getDocs(query(collection(db, 'connectionRequests'), where('__name__', '==', requestId)));

    if (requestSnap.empty) {
      throw new Error('Connection request not found.');
    }

    const requestData = requestSnap.docs[0].data();
    const { fromUid, toUid } = requestData;

    await updateDoc(requestRef, { status: 'accepted' });

    // Create a connection entry
    await addDoc(collection(db, 'connections'), {
      user1Uid: fromUid,
      user2Uid: toUid,
      createdAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error: any) {
    console.error('Error accepting connection request:', error);
    return { success: false, error: error.message };
  }
};

export const rejectConnectionRequest = async (requestId: string) => {
  try {
    const requestRef = doc(db, 'connectionRequests', requestId);
    await updateDoc(requestRef, { status: 'rejected' });
    return { success: true };
  } catch (error: any) {
    console.error('Error rejecting connection request:', error);
    return { success: false, error: error.message };
  }
};

export const getPendingRequests = async (uid: string) => {
  try {
    const q = query(
      collection(db, 'connectionRequests'),
      where('toUid', '==', uid),
      where('status', '==', 'pending')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting pending requests:', error);
    return [];
  }
};

export const getConnections = async (uid: string) => {
  try {
    const q = query(
      collection(db, 'connections'),
      where('user1Uid', '==', uid)
    );
    const q2 = query(
      collection(db, 'connections'),
      where('user2Uid', '==', uid)
    );

    const [snapshot1, snapshot2] = await Promise.all([getDocs(q), getDocs(q2)]);
    const connections = [...snapshot1.docs, ...snapshot2.docs].map(doc => ({ id: doc.id, ...doc.data() }));
    return connections;
  } catch (error) {
    console.error('Error getting connections:', error);
    return [];
  }
};

export const deleteConnection = async (connectionId: string) => {
  try {
    await deleteDoc(doc(db, 'connections', connectionId));
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting connection:', error);
    return { success: false, error: error.message };
  }
};

export const searchUsers = async (searchTerm: string) => {
  try {
    console.log('Searching for users with searchTerm:', searchTerm);
    const usersRef = collection(db, 'users');
    const q = query(
      usersRef,
      where('displayName', '>=', searchTerm),
      where('displayName', '<', searchTerm + '\uf8ff')
    );
    const querySnapshot = await getDocs(q);
    const results = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log('Search results:', results);
    return results;
  } catch (error) {
    console.error('Error searching users:', error);
    return [];
  }
};
