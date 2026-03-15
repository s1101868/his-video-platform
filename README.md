# HIS 醫療影片平台 (簡易範例)

這是一個簡單的 Node/Express + 靜態前端範例，提供：

- 登入與科別選擇頁面
- 依照 C:\HIS\WHO 資料夾內的影片列出清單
- 點選左側清單即可播放影片

要求
- 在執行此專案的電腦上，請確認資料夾 `C:\HIS\WHO` 存在並包含影片檔（例如 .mp4、.webm、.mov、.mkv）。
- 已安裝 Node.js

安裝與執行

```powershell
cd C:\HIS
npm install
npm start
```

之後開啟瀏覽器到 http://localhost:3000

備註
- 若影片檔名包含空白或非 ASCII 字元，系統會將檔案名稱做 URL encoding，因此點選清單即可正常播放。
- 這個範例沒有使用真實認證，僅示範介面流程；要上線請加入身分驗證與權限管理。
