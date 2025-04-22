
const map = L.map('map', {
    dragging: true,
    //zoomSnap: 0.5,
    zoomControl: false
}).setView([35.5, 135.5], 6);
L.tileLayer.provider('MapBox', { id: 'YOUR MAP ID', accessToken: 'YOUR ACCESS TOKEN' }).addTo(map);

let geojsonLayer = null;
const colorPicker = document.getElementById('colorPicker');
const penRadiusPicker = document.getElementById('penRadiusPicker');
const initialColorPicker = document.getElementById('initialColorPicker');
const initialWeightPicker = document.getElementById('initialWeightPicker');
let isPenMode = false;
let isEraseMode = false;
let isMouseDown = false;

const mouseCircle = L.circle([0, 0], {
    radius: parseInt(penRadiusPicker.value),
    color: 'red',
    fillColor: 'red',
    fillOpacity: 0.2,
    weight: 1
}).addTo(map);
mouseCircle.setStyle({ opacity: 0, fillOpacity: 0 });

penRadiusPicker.addEventListener('input', () => {
    mouseCircle.setRadius(parseInt(penRadiusPicker.value));
});

const controls = document.getElementById('controls');
const toggleMenu = document.getElementById('toggleMenu');
toggleMenu.addEventListener('click', () => {
    controls.classList.toggle('closed');
    toggleMenu.textContent = controls.classList.contains('closed') ? 'メニューを開く' : 'メニューを閉じる';
});

document.getElementById('fileInput').addEventListener('change', (event) => {
    loadGeoJSONFile(event.target.files[0]);
});

function loadGeoJSONFile(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const input = JSON.parse(e.target.result);
            const features = input.features;

            const sortedFeatures = [
                ...features.filter(f => !f.properties.color),
                ...features.filter(f => f.properties.color)
            ];

            const data = {
                ...input,
                features: sortedFeatures
            };

            if (geojsonLayer) {
                map.removeLayer(geojsonLayer);
            }
            geojsonLayer = L.geoJSON(data, {
                style: feature => ({
                    color: feature.properties.color || initialColorPicker.value,
                    weight: feature.properties.weight || initialWeightPicker.value
                })
            }).addTo(map);
            map.fitBounds(geojsonLayer.getBounds());
        } catch (error) {
            console.error('GeoJSON読み込みエラー:', error);
            alert('無効なGeoJSONファイルです');
        }
    };
    reader.readAsText(file);
}

document.getElementById('saveLocal').addEventListener('click', () => {
    if (!geojsonLayer) {
        alert('GeoJSONデータがありません');
        return;
    }
    const geojsonData = geojsonLayer.toGeoJSON();
    const dataString = JSON.stringify(geojsonData);
    const dataSizeMB = new TextEncoder().encode(dataString).length / (1024 * 1024);

    if (dataSizeMB > 5) {
        alert('データが大きすぎます（' + dataSizeMB.toFixed(2) + 'MB）。LocalStorageの制限（約5MB）を超えています。代わりに「ファイルにエクスポート」を使用してください。');
        return;
    }

    try {
        localStorage.setItem('geojsonData', dataString);
        alert('LocalStorageに保存しました');
    } catch (error) {
        console.error('LocalStorage保存エラー:', error);
        alert('LocalStorageへの保存に失敗しました。データが大きすぎる可能性があります。「ファイルにエクスポート」を試してください。');
    }
});

document.getElementById('exportFile').addEventListener('click', () => {
    if (!geojsonLayer) {
        alert('GeoJSONデータがありません');
        return;
    }
    const geojsonData = geojsonLayer.toGeoJSON();
    const blob = new Blob([JSON.stringify(geojsonData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'saved_geojson.geojson';
    a.click();
    URL.revokeObjectURL(url);
});

const savedData = localStorage.getItem('geojsonData');
if (savedData) {
    try {
        const data = JSON.parse(savedData);
        geojsonLayer = L.geoJSON(data, {
            style: feature => ({
                color: feature.properties.color || initialColorPicker.value,
                weight: feature.properties.weight || initialWeightPicker.value
            })
        }).addTo(map);
        map.fitBounds(geojsonLayer.getBounds());
    } catch (error) {
        console.error('LocalStorage読み込みエラー:', error);
    }
}

function setPenMode() {
    isPenMode = true;
    isEraseMode = false;
    map.dragging.disable();
    document.getElementById('penMode').disabled = true;
    document.getElementById('dragMode').disabled = false;
    document.getElementById('eraseMode').disabled = false;
}

function setDragMode() {
    isPenMode = false;
    isEraseMode = false;
    map.dragging.enable();
    mouseCircle.setStyle({ opacity: 0, fillOpacity: 0 });
    document.getElementById('penMode').disabled = false;
    document.getElementById('dragMode').disabled = true;
    document.getElementById('eraseMode').disabled = false;
}

function setEraseMode() {
    isPenMode = false;
    isEraseMode = true;
    map.dragging.disable();
    document.getElementById('penMode').disabled = false;
    document.getElementById('dragMode').disabled = false;
    document.getElementById('eraseMode').disabled = true;
}

document.getElementById('penMode').addEventListener('click', setPenMode);
document.getElementById('dragMode').addEventListener('click', setDragMode);
document.getElementById('eraseMode').addEventListener('click', setEraseMode);

document.addEventListener('keydown', (e) => {
    if (e.key === 'p' || e.key === 'P') {
        setPenMode();
    } else if (e.key === 'd' || e.key === 'D') {
        setDragMode();
    } else if (e.key === 'e' || e.key === 'E') {
        setEraseMode();
    }
});

document.getElementById('dragMode').disabled = true;

function throttle(fn, wait) {
    let lastTime = 0;
    return function (...args) {
        const now = Date.now();
        if (now - lastTime >= wait) {
            fn(...args);
            lastTime = now;
        }
    };
}

map.on('mousemove', throttle((e) => {
    if (!isPenMode && !isEraseMode) return;

    mouseCircle.setLatLng(e.latlng);
    mouseCircle.setStyle({ opacity: 1, fillOpacity: 0.2 });

    if (isMouseDown && geojsonLayer) {
        const circleGeoJSON = turf.circle(
            [e.latlng.lng, e.latlng.lat],
            parseInt(penRadiusPicker.value),
            { units: 'meters' }
        );

        const updatedLayers = [];
        geojsonLayer.eachLayer(layer => {
            const lineGeoJSON = layer.toGeoJSON();
            let isInside = false;

            const coordinates = lineGeoJSON.geometry.type == "LineString" ?
                lineGeoJSON.geometry.coordinates : lineGeoJSON.geometry.coordinates[0];
            const checkPoints = [
                coordinates[0],
                coordinates[coordinates.length - 1]
            ];

            for (let coord of coordinates) { // 重いときは"checkPoints"に変更
                const point = turf.point(coord);
                if (turf.inside(point, circleGeoJSON)) {
                    isInside = true;
                    break;
                }
            }

            if (isInside) {
                const newColor = isEraseMode ? initialColorPicker.value
                    : colorPicker.value;
                lineGeoJSON.properties.color = isEraseMode ? "" : newColor;
                updatedLayers.push([layer, {
                    color: newColor,
                    weight: lineGeoJSON.properties.weight || initialWeightPicker.value
                }]);
            }
        });

        updatedLayers.forEach(([layer, style]) => {
            layer.setStyle(style);
        });
    }
}, 50));

map.on('mousedown', () => {
    if (isPenMode || isEraseMode) isMouseDown = true;
});

map.on('mouseup', () => {
    isMouseDown = false;
});

map.on('mouseout', () => {
    if (isPenMode || isEraseMode) {
        mouseCircle.setStyle({ opacity: 0, fillOpacity: 0 });
    }
    isMouseDown = false;
});