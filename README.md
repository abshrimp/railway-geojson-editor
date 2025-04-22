# Railway GeoJSON Editor

鉄道路線データ（GeoJSON）を可視化・編集できるブラウザベースの地図エディタです。Leafletをベースにしており、色・線の太さの編集、ローカル保存、ファイルエクスポートなどの機能を備えています。

## 特徴 ✨

- GeoJSON形式の鉄道路線データの表示
- 表示色の変更
- LocalStorage保存・ファイルエクスポート対応
- ショートカットキー利用可能（P/D/Eキー切り替え）

## データの取得方法 🔽

本ツールで使用する鉄道GeoJSONデータは、国土交通省の「国土数値情報」から入手できます。

1. 下記ページにアクセス  
   👉 [国土数値情報（鉄道）N02-2023](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N02-2023.html)

2. ページ下部から任意の年度のデータをダウンロード

3. ZIPファイルを解凍

4. 解凍されたフォルダ内にある `N02-XX_RailroadSection.geojson` をこのアプリで読み込んでください

## Mapbox の設定 🌍

本アプリでは、背景地図に **Mapbox** を使用しています。使用するには **Map ID** と **Access Token** を取得し、以下のように `main.js` に設定する必要があります。

```js
// main.js
L.tileLayer.provider('MapBox', { id: 'YOUR MAP ID', accessToken: 'YOUR ACCESS TOKEN' }).addTo(map);
```

## 📄 ライセンス

MIT License
