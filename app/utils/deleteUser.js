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

  try {
    const postsQ = query(collection(db, 'Posts'), where('userId', '==', userId));
    const postsSnap = await getDocs(postsQ);
    const deletePostsPromises = postsSnap.docs.map(d => deleteDoc(doc(db, 'Posts', d.id)));
    await Promise.all(deletePostsPromises);
    console.log(`Deleted ${postsSnap.docs.length} posts`);
  } catch (err) {
    console.error("Error deleting posts:", err);
  }

  try {
    const jobsQ = query(collection(db, 'JobsPosts'), where('userId', '==', userId));
    const jobsSnap = await getDocs(jobsQ);
    const deleteJobsPromises = jobsSnap.docs.map(d => deleteDoc(doc(db, 'JobsPosts', d.id)));
    await Promise.all(deleteJobsPromises);
    console.log(`Deleted ${jobsSnap.docs.length} job postings`);
  } catch (err) {
    console.error("Error deleting jobs:", err);
  }

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

  try {
    const prePostsQ = query(collection(db, 'prePosts'), where('userId', '==', userId));
    const prePostsSnap = await getDocs(prePostsQ);
    const deletePrePostsPromises = prePostsSnap.docs.map(d => deleteDoc(doc(db, 'prePosts', d.id)));
    await Promise.all(deletePrePostsPromises);
    console.log(`Deleted ${prePostsSnap.docs.length} prePosts`);
  } catch (err) {
    console.error("Error deleting prePosts:", err);
  }

  try {
    const followingSnap = await getDocs(collection(db, 'Users', userId, 'following'));
    const followingPromises = followingSnap.docs.map(async (fDoc) => {
      const followedUserId = fDoc.id;
      await deleteDoc(doc(db, 'Users', followedUserId, 'followers', userId));
      try {
        await updateDoc(doc(db, 'Users', followedUserId), {
          followersCount: increment(-1)
        });
      } catch (e) {
        console.warn(`Could not update followersCount for ${followedUserId}`, e);
      }
      await deleteDoc(doc(db, 'Users', userId, 'following', followedUserId));
    });
    await Promise.all(followingPromises);
    console.log(`Cleaned up ${followingSnap.docs.length} followings`);
  } catch (err) {
    console.error("Error cleaning up followings:", err);
  }

  try {
    const followersSnap = await getDocs(collection(db, 'Users', userId, 'followers'));
    const followersPromises = followersSnap.docs.map(async (fDoc) => {
      const followerUserId = fDoc.id;
      await deleteDoc(doc(db, 'Users', followerUserId, 'following', userId));
      try {
        await updateDoc(doc(db, 'Users', followerUserId), {
          followingCount: increment(-1)
        });
      } catch (e) {
        console.warn(`Could not update followingCount for ${followerUserId}`, e);
      }
      await deleteDoc(doc(db, 'Users', userId, 'followers', followerUserId));
    });
    await Promise.all(followersPromises);
    console.log(`Cleaned up ${followersSnap.docs.length} followers`);
  } catch (err) {
    console.error("Error cleaning up followers:", err);
  }

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

  try {
    const chatsSnap = await getDocs(collection(db, 'Users', userId, 'chats'));
    const chatPromises = chatsSnap.docs.map(async (cDoc) => {
      const chatId = cDoc.id;
      const chatData = cDoc.data();
      const recipientId = chatData.otherUserId;

      try {
        const messagesSnap = await getDocs(collection(db, 'chats', chatId, 'messages'));
        const deleteMessagesPromises = messagesSnap.docs.map(mDoc => deleteDoc(doc(db, 'chats', chatId, 'messages', mDoc.id)));
        await Promise.all(deleteMessagesPromises);
        console.log(`Deleted ${messagesSnap.docs.length} messages in chat: ${chatId}`);
      } catch (msgErr) {
        console.error(`Error deleting messages in chat ${chatId}:`, msgErr);
      }

      try {
        await deleteDoc(doc(db, 'chats', chatId));
      } catch (e) {
        console.error(`Error deleting global chat document ${chatId}:`, e);
      }

      if (recipientId) {
        try {
          await deleteDoc(doc(db, 'Users', recipientId, 'chats', chatId));
        } catch (e) {
          console.error(`Error deleting chat ref from recipient ${recipientId}:`, e);
        }
      }

      await deleteDoc(doc(db, 'Users', userId, 'chats', chatId));
    });
    await Promise.all(chatPromises);
    console.log(`Deleted ${chatsSnap.docs.length} chats`);
  } catch (err) {
    console.error("Error cleaning up chats:", err);
  }

  try {
    await deleteDoc(doc(db, 'Users', userId));
    console.log(`Successfully deleted user document Users/${userId}`);
  } catch (err) {
    console.error("Error deleting user main document:", err);
    throw err;
  }

  console.log(`Cascading delete finished for user: ${userId}`);
}
