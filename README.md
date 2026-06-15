# 國字標準字體字帖產生器

一個可在瀏覽器直接使用的 A4 國字字帖產生器。輸入國字後，網站會依設定產生可列印的字帖，並自動顯示注音。

正式網站：[https://copybook.hankchen.info/](https://copybook.hankchen.info/)

## 功能

- 產生 A4 直式國字字帖。
- 支援田字格、米字格、新式九宮格與空白格。
- 支援紅字、黑字、灰字、鏤空與空白練習模式。
- 可顯示或隱藏注音。
- 多音字可開啟選音視窗，依前後各 1 字上下文同步套用讀音。
- 可設定欄數、列數、重複次數，或自動填滿頁面。
- 列印時只輸出右側 A4 字帖，不輸出設定面板。

## 設計依據

- 字帖字體使用教育部標準楷書。
- 注音位置遵從《國語注音符號手冊》。
- 注音資料來源為 [ButTaiwan/bpmfvs](https://github.com/ButTaiwan/bpmfvs) 的 `datas/phonic_table_Z.txt`，由 `tools/split-phonic-by-keep-list.mjs` 依 `datas/保留清單.txt` 切分為常用 4808 字（`datas/phonic_table_Z_4808.txt`）與其餘字集（`datas/phonic_table_Z_other.txt`），再由 `tools/generate-phonic-js.mjs` 轉成瀏覽器載入的 `.js` 檔；常用 4808 字隨頁載入，其餘缺字時懶載入。

## 使用方式

直接用瀏覽器開啟 `index.html` 即可使用。

若瀏覽器因 `file://` 限制導致資料載入失敗，可改用本機靜態伺服器：

```bash
python -m http.server 8765
```

再開啟：

```text
http://127.0.0.1:8765/
```

## 開發

本專案是純前端靜態網站，主要檔案如下：

- `index.html`：頁面結構與控制面板。
- `style.css`：版面、字帖格線、列印樣式與 modal 樣式。
- `copybook-app.js`：瀏覽器互動、資料載入與字帖渲染。
- `copybook-core.js`：可測試的核心資料處理函式。
- `tests/copybook-core.test.mjs`：核心函式測試。
- `datas/phonic_table_Z.txt`：注音查表資料。
- `fonts/edukai-5.1_20251208.ttf`：教育部標準楷書字型檔。
- `favicon/`：網站 favicon、Apple touch icon 與 web app manifest 圖示。
- `robots.txt`、`sitemap.xml`：搜尋引擎爬取與索引用檔案。

執行測試：

```bash
npm test
```

重新產生瀏覽器用注音資料：

```bash
node tools/split-phonic-by-keep-list.mjs
node tools/generate-phonic-js.mjs
```

## 授權

本專案採分層授權：

- 原始碼：MIT License。
- 網站內容與文件：姓名標示─非商業性─禁止改作 3.0 台灣。
- 教育部標準楷書字型檔：採創用 CC「姓名標示-禁止改作」授權。如需引用，請標示「中華民國教育部」。
- 注音資料 `datas/phonic_table_Z.txt`：來源為 [ButTaiwan/bpmfvs](https://github.com/ButTaiwan/bpmfvs)，採 Apache License 2.0 授權。

第三方素材與資料保留其原授權，不屬於本專案原始碼的 MIT 授權範圍。詳細標示請見 [NOTICE.md](NOTICE.md)。

## 作者

[Hank Chen](https://hankchen.info/)
