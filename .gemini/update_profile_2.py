import re

filepath = r'c:\Users\furkan\OneDrive\Masaüstü\Leapit\app\screens\ProfilePage.js'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update Projeler mapping in fetchTabData
old_projeler = """      } else if (selectedTab === 'Projeler') {
        const snapshot = await getDocs(collection(db, 'Users', userId, 'projects'));
        data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));"""

new_projeler = """      } else if (selectedTab === 'Projeler') {
        const snapshot = await getDocs(collection(db, 'Users', userId, 'projects'));
        data = await Promise.all(snapshot.docs.map(async d => {
          const projectData = d.data();
          let isSaved = false;
          if (loggedInUserId) {
            const saveRef = doc(db, 'Users', loggedInUserId, 'saves', 'Projeler', 'items', d.id);
            const saveSnap = await getDoc(saveRef);
            isSaved = saveSnap.exists();
          }
          return {
            id: d.id,
            ...projectData,
            saved: isSaved
          };
        }));"""

if old_projeler in content:
    content = content.replace(old_projeler, new_projeler, 1)
    
# 2. Update saved in Kaydedilenler mapping using regex to ignore spacing
content, count = re.subn(
    r'(liked:\s*postData\.likedBy\?\.includes\(loggedInUserId\)\s*\|\|\s*false,[\s\n]*repeated:\s*postData\.repeatedBy\?\.includes\(loggedInUserId\)\s*\|\|\s*false,[\s\n]*)saved:\s*postData\.savedBy\?\.includes\(loggedInUserId\)\s*\|\|\s*false,',
    r'\g<1>saved: true,',
    content
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("SUCCESS, regex matches:", count)
