// popup.js
document.getElementById('connectBtn').addEventListener('click', () => {
  // Cari tab yang sedang aktif
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      // Kirim pesan ke tab tersebut
      chrome.tabs.sendMessage(tabs[0].id, { 
        type: 'CONNECT_TO_WEBAPP', 
        payload: 'Sinyal koneksi dari ekstensi!' 
      });
    }
  });
});
