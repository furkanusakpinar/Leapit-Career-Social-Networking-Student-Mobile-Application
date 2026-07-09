filepath = r'c:\Users\furkan\OneDrive\Masaüstü\Leapit\app\screens\ProfilePage.js'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

replacement = """      } else if (selectedTab === 'Kaydedilenler') {
        if (!savedCategory) {
          setTabData([]);
          return;
        }

        const path = `Users/${userId}/saves/${savedCategory}/items`;
        console.log("Sorgulanan Firestore Yolu:", path);

        const savesSnap = await getDocs(collection(db, path));
        
        if (savedCategory === 'Projeler') {
          const projectDocs = await Promise.all(savesSnap.docs.map(async d => {
            const saveData = d.data();
            const ownerId = saveData.ownerId || userId;
            try {
              const projectSnap = await getDoc(doc(db, 'Users', ownerId, 'projects', d.id));
              if (projectSnap.exists()) {
                const projectData = projectSnap.data();
                let authorName = 'İsimsiz';
                let authorAvatar = null;
                let authorDetails = '';
                
                try {
                  const uSnap = await getDoc(doc(db, 'Users', ownerId));
                  if (uSnap.exists()) {
                    const uData = uSnap.data();
                    authorName = uData.fullName || 'İsimsiz';
                    authorAvatar = uData.profileImageUrl || null;
                    authorDetails = [uData.company, uData.job].filter(Boolean).join(' | ');
                  }
                } catch (e) {
                  console.error("Author fetch error for saved project:", e);
                }

                return {
                  id: projectSnap.id,
                  ...projectData,
                  userId: ownerId,
                  profileImageUrl: authorAvatar,
                  userName: authorName,
                  details: authorDetails,
                  content: projectData.readme || projectData.content || '',
                  saved: true
                };
              }
            } catch (err) {
              console.error("Error fetching saved project:", err);
            }
            return null;
          }));
          data = projectDocs.filter(Boolean);
          console.log("Çekilen Proje sayısı:", data.length);
        } else {
          let collectionPath = "";
          if (savedCategory === 'Postlar') collectionPath = "Posts";
          else if (savedCategory === 'İş İlanları') collectionPath = "JobsPosts";

          if (collectionPath) {
             let ids = savesSnap.docs.map(d => d.id);
             console.log("Bulunan ID'ler:", ids);

             if (ids.length > 0) {
                const postsSnap = await getDocs(query(collection(db, collectionPath), where("__name__", "in", ids.slice(0, 30))));
                data = await Promise.all(postsSnap.docs.map(async d => {
                  const postData = d.data();
                  let authorName = 'İsimsiz';
                  let authorAvatar = null;
                  let authorDetails = '';
                  let companyLogo = null;
                  
                  if (savedCategory === 'İş İlanları') {
                    try {
                      companyLogo = await getCompanyLogoUri(postData.company || '');
                    } catch (e) {
                      console.error("Company logo error:", e);
                    }
                  }
                  
                  if (postData.userId) {
                    try {
                      const uSnap = await getDoc(doc(db, 'Users', postData.userId));
                      if (uSnap.exists()) {
                        const uData = uSnap.data();
                        authorName = uData.fullName || 'İsimsiz';
                        authorAvatar = uData.profileImageUrl || null;
                        authorDetails = [uData.company, uData.job].filter(Boolean).join(' | ');
                      }
                    } catch (e) {
                      console.error("Author fetch error:", e);
                    }
                  }
                  return {
                    id: d.id,
                    ...postData,
                    profileImageUrl: authorAvatar,
                    userName: authorName,
                    details: authorDetails,
                    companyLogo,
                    liked: postData.likedBy?.includes(loggedInUserId) || false,
                    repeated: postData.repeatedBy?.includes(loggedInUserId) || false,
                    saved: true,
                    likesCount: postData.likedBy?.length || 0,
                    repeatsCount: postData.repeatedBy?.length || 0,
                    commentsCount: postData.comments?.length || 0,
                  };
                }));
                console.log("Çekilen veri sayısı:", data.length);
             }
          }
        }"""

start_sub = "else if (selectedTab === 'Kaydedilenler') {"
idx = content.find(start_sub)
if idx != -1:
    brace_count = 0
    end_idx = -1
    for i in range(idx + len(start_sub), len(content)):
        if content[i] == '{':
            brace_count += 1
        elif content[i] == '}':
            brace_count -= 1
            if brace_count == -1:
                end_idx = i + 1
                break
    if end_idx != -1:
        new_content = content[:idx] + replacement + content[end_idx:]
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("SUCCESS")
    else:
        print("FAILED to find closing brace")
else:
    print("FAILED to find start_sub")
