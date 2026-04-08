// 📁 src/services/notionProxy.js
// C'est ici qu'on branchera Vercel plus tard.
export const submitLogToNotion = async (payload) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve({ success: true, data: payload });
    }, 800);
  });
};