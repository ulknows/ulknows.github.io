# RPG Stat Graph — วิธีลง GitHub Pages

ไฟล์ในนี้มี 2 ไฟล์ที่ต้องใช้จริง:

- `index.html` — หน้าเว็บหลัก
- `app.js` — โค้ดแอปทั้งหมด (รวม React ไว้ในตัวแล้ว ไม่ต้องต่อเน็ตหรือใช้ CDN)

เปิด `index.html` ในเบราว์เซอร์โดยตรงก็ใช้งานได้เลย (ดับเบิลคลิกไฟล์) แต่ถ้าจะขึ้นเว็บจริงผ่าน GitHub Pages ให้ทำตามนี้:

## ขั้นตอนลง GitHub Pages

1. **สร้าง repository ใหม่บน GitHub** (หรือใช้ของเดิมที่มีอยู่แล้วก็ได้)
   - ไปที่ https://github.com/new
   - ตั้งชื่อ repo เช่น `rpg-stat-graph`
   - เลือก Public (GitHub Pages แบบฟรีต้องเป็น public repo ถ้าใช้บัญชีฟรี)

2. **อัปโหลดไฟล์ 2 ไฟล์นี้ขึ้น repo** (`index.html` และ `app.js`) โดยวางไว้ที่ **root ของ repo** (ไม่ต้องอยู่ในโฟลเดอร์ย่อย)
   - จะใช้วิธี drag-and-drop ผ่านหน้าเว็บ GitHub ("Add file" → "Upload files") หรือ `git push` ก็ได้

3. **เปิดใช้งาน GitHub Pages**
   - ไปที่ repo → **Settings** → เมนูซ้าย **Pages**
   - หัวข้อ "Build and deployment" → **Source** เลือก **Deploy from a branch**
   - **Branch** เลือก `main` (หรือ branch ที่อัปโหลดไฟล์ไว้) และโฟลเดอร์เลือก `/ (root)`
   - กด **Save**

4. **รอสักครู่ (ประมาณ 1-2 นาที)** แล้วเว็บจะขึ้นที่:
   ```
   https://<ชื่อ-user-github>.github.io/<ชื่อ-repo>/
   ```
   เช่นถ้า username คือ `somchai` และ repo ชื่อ `rpg-stat-graph` จะได้ลิงก์:
   `https://somchai.github.io/rpg-stat-graph/`

## ถ้าอยากแก้ไขฟีเจอร์ในอนาคต

ไฟล์ `app.js` เป็นโค้ดที่ **บีบอัด/แปลงแล้ว** (minified) ไม่เหมาะจะแก้ตรงๆ ให้แก้ที่ไฟล์ต้นฉบับ `node-graph-editor.jsx` (ไฟล์ React component ที่ให้ไปก่อนหน้านี้) แล้วค่อย build ใหม่ ถ้ามี Node.js ในเครื่อง ทำได้ด้วยคำสั่ง:

```bash
npm install esbuild react react-dom --no-save
npx esbuild main.jsx --bundle --format=iife --minify --outfile=app.js
```

โดย `main.jsx` เป็นไฟล์เล็กๆ ที่ import ตัว component หลักมา mount:

```jsx
import React from "react";
import ReactDOM from "react-dom/client";
import NodeGraphEditor from "./node-graph-editor.jsx";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<NodeGraphEditor />);
```

แก้โค้ดใน `node-graph-editor.jsx` แล้วรันคำสั่ง build ด้านบนใหม่ทุกครั้ง จะได้ `app.js` เวอร์ชันล่าสุดมาแทนที่ไฟล์เดิม แล้วค่อย push ขึ้น GitHub อีกที
