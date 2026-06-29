import {
  collection,
  doc,
  getDocs,
  deleteDoc,
  updateDoc,
  query,
  where,
  increment
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';

export async function deleteUserData(userId) {
  if (!userId) throw new Error("deleteUserData: userId is required");

  console.log(`Starting cascading delete for user: ${userId}`);

  // 1. Posts (global collection)
  try {
    const postsQ = query(collection(db, 'Posts'), where('userId', '==', userId));
    const postsSnap = await getDocs(postsQ);
    const deletePostsPromises = postsSnap.docs.map(d => deleteDoc(doc(db, 'Posts', d.id)));
    await Promise.all(deletePostsPromises);
    console.log(`Deleted ${postsSnap.docs.length} posts`);
  } catch (err) {
    console.error("Error deleting posts:", err);
  }

  // 2. JobsPosts (global collection)
  try {
    const jobsQ = query(collection(db, 'JobsPosts'), where('userId', '==', userId));
    const jobsSnap = await getDocs(jobsQ);
    const deleteJobsPromises = jobsSnap.docs.map(d => deleteDoc(doc(db, 'JobsPosts', d.id)));
    await Promise.all(deleteJobsPromises);
    console.log(`Deleted ${jobsSnap.docs.length} job postings`);
  } catch (err) {
    console.error("Error deleting jobs:", err);
  }

  // 3. connectionRequests (global collection)
  try {
    const connQ1 = query(collection(db, 'connectionRequests'), where('senderUserId', '==', userId));
    const connQ2 = query(collection(db, 'connectionRequests'), where('receiverUserId', '==', userId));
    
    const [snap1, snap2] = await Promise.all([getDocs(connQ1), getDocs(connQ2)]);
    const deleteConnPromises = [
      ...snap1.docs.map(d => deleteDoc(doc(db, 'connectionRequests', d.id))),
      ...snap2.docs.map(d => deleteDoc(doc(db, 'connectionRequests', d.id)))
    ];
    await Promise.all(deleteConnPromises);
    console.log(`Deleted ${deleteConnPromises.length} connection requests`);
  } catch (err) {
    console.error("Error deleting connection requests:", err);
  }

  // 4. prePosts (global collection)
  try {
    const prePostsQ = query(collection(db, 'prePosts'), where('userId', '==', userId));
    const prePostsSnap = await getDocs(prePostsQ);
    const deletePrePostsPromises = prePostsSnap.docs.map(d => deleteDoc(doc(db, 'prePosts', d.id)));
    await Promise.all(deletePrePostsPromises);
    console.log(`Deleted ${prePostsSnap.docs.length} prePosts`);
  } catch (err) {
    console.error("Error deleting prePosts:", err);
  }

  // 5. Followers & Following (cleanup and counts decrement)
  // Let's find who this user is following:
  try {
    const followingSnap = await getDocs(collection(db, 'Users', userId, 'following'));
    const followingPromises = followingSnap.docs.map(async (fDoc) => {
      const followedUserId = fDoc.id; // The ID of the user being followed
      // Delete follower entry from the followed user: Users/followedUserId/followers/userId
      await deleteDoc(doc(db, 'Users', followedUserId, 'followers', userId));
      // Decrement the followed user's followersCount
      try {
        await updateDoc(doc(db, 'Users', followedUserId), {
          followersCount: increment(-1)
        });
      } catch (e) {
        console.warn(`Could not update followersCount for ${followedUserId}`, e);
      }
      // Delete the following entry itself
      await deleteDoc(doc(db, 'Users', userId, 'following', followedUserId));
    });
    await Promise.all(followingPromises);
    console.log(`Cleaned up ${followingSnap.docs.length} followings`);
  } catch (err) {
    console.error("Error cleaning up followings:", err);
  }

  // Let's find who is following this user:
  try {
    const followersSnap = await getDocs(collection(db, 'Users', userId, 'followers'));
    const followersPromises = followersSnap.docs.map(async (fDoc) => {
      const followerUserId = fDoc.id; // The ID of the follower user
      // Delete following entry from the follower user: Users/followerUserId/following/userId
      await deleteDoc(doc(db, 'Users', followerUserId, 'following', userId));
      // Decrement the follower's followingCount
      try {
        await updateDoc(doc(db, 'Users', followerUserId), {
          followingCount: increment(-1)
        });
      } catch (e) {
        console.warn(`Could not update followingCount for ${followerUserId}`, e);
      }
      // Delete the follower entry itself
      await deleteDoc(doc(db, 'Users', userId, 'followers', followerUserId));
    });
    await Promise.all(followersPromises);
    console.log(`Cleaned up ${followersSnap.docs.length} followers`);
  } catch (err) {
    console.error("Error cleaning up followers:", err);
  }

  // 6. User Subcollections: blog, projects, notifications
  try {
    const blogSnap = await getDocs(collection(db, 'Users', userId, 'blog'));
    const deleteBlogPromises = blogSnap.docs.map(d => deleteDoc(doc(db, 'Users', userId, 'blog', d.id)));
    await Promise.all(deleteBlogPromises);
    console.log(`Deleted ${blogSnap.docs.length} blog entries`);
  } catch (err) {
    console.error("Error deleting user blogs:", err);
  }

  try {
    const projectsSnap = await getDocs(collection(db, 'Users', userId, 'projects'));
    const deleteProjectsPromises = projectsSnap.docs.map(d => deleteDoc(doc(db, 'Users', userId, 'projects', d.id)));
    await Promise.all(deleteProjectsPromises);
    console.log(`Deleted ${projectsSnap.docs.length} projects`);
  } catch (err) {
    console.error("Error deleting user projects:", err);
  }

  try {
    const notificationsSnap = await getDocs(collection(db, 'Users', userId, 'notifications'));
    const deleteNotificationsPromises = notificationsSnap.docs.map(d => deleteDoc(doc(db, 'Users', userId, 'notifications', d.id)));
    await Promise.all(deleteNotificationsPromises);
    console.log(`Deleted ${notificationsSnap.docs.length} notifications`);
  } catch (err) {
    console.error("Error deleting user notifications:", err);
  }

  // 7. Chats and messages
  try {
    const chatsSnap = await getDocs(collection(db, 'Users', userId, 'chats'));
    const chatPromises = chatsSnap.docs.map(async (cDoc) => {
      const chatId = cDoc.id; // e.g. "userA_userB"
      const chatData = cDoc.data();
      const recipientId = chatData.otherUserId;

      // Delete all messages in the global chat collection: chats/chatId/messages/*
      try {
        const messagesSnap = await getDocs(collection(db, 'chats', chatId, 'messages'));
        const deleteMessagesPromises = messagesSnap.docs.map(mDoc => deleteDoc(doc(db, 'chats', chatId, 'messages', mDoc.id)));
        await Promise.all(deleteMessagesPromises);
        console.log(`Deleted ${messagesSnap.docs.length} messages in chat: ${chatId}`);
      } catch (msgErr) {
        console.error(`Error deleting messages in chat ${chatId}:`, msgErr);
      }

      // Delete global chat document: chats/chatId
      try {
        await deleteDoc(doc(db, 'chats', chatId));
      } catch (e) {
        console.error(`Error deleting global chat document ${chatId}:`, e);
      }

      // Delete chat reference from recipient user: Users/recipientId/chats/chatId
      if (recipientId) {
        try {
          await deleteDoc(doc(db, 'Users', recipientId, 'chats', chatId));
        } catch (e) {
          console.error(`Error deleting chat ref from recipient ${recipientId}:`, e);
        }
      }

      // Delete chat reference from this user: Users/userId/chats/chatId
      await deleteDoc(doc(db, 'Users', userId, 'chats', chatId));
    });
    await Promise.all(chatPromises);
    console.log(`Deleted ${chatsSnap.docs.length} chats`);
  } catch (err) {
    console.error("Error cleaning up chats:", err);
  }

  // 8. Delete user main document: Users/userId
  try {
    await deleteDoc(doc(db, 'Users', userId));
    console.log(`Successfully deleted user document Users/${userId}`);
  } catch (err) {
    console.error("Error deleting user main document:", err);
    throw err;
  }

  console.log(`Cascading delete finished for user: ${userId}`);
}
