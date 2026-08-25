// 住所文字列を緯度経度に変換するサービス。
//
// GOOGLE_MAPS_API_KEY が設定されていれば Google Maps Geocoding API（有料・高精度）を、
// 未設定の場合は国土地理院（GSI）住所検索API（無料・キー不要・日本国内向け）を使う。
// 本番移行時はRenderの環境変数にGOOGLE_MAPS_API_KEYを追加するだけで、
// コード変更なしに自動でGoogle Maps側へ切り替わる。

const GOOGLE_GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';
const GSI_GEOCODE_URL = 'https://msearch.gsi.go.jp/address-search/AddressSearch';

async function geocodeWithGoogleMaps(address, apiKey) {
  const url = `${GOOGLE_GEOCODE_URL}?address=${encodeURIComponent(address)}&language=ja&region=jp&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = new Error(`ジオコーディングAPIの呼び出しに失敗しました (status ${res.status})`);
    err.code = 'GEOCODING_REQUEST_FAILED';
    throw err;
  }

  const data = await res.json();
  if (data.status === 'ZERO_RESULTS') return null;
  if (data.status !== 'OK') {
    const err = new Error(`ジオコーディングに失敗しました: ${data.status}${data.error_message ? ` (${data.error_message})` : ''}`);
    err.code = 'GEOCODING_REQUEST_FAILED';
    throw err;
  }

  const location = data.results?.[0]?.geometry?.location;
  if (!location) return null;
  return { lat: location.lat, lng: location.lng };
}

// 国土地理院 住所検索API（無料・APIキー不要）。建物名などが含まれると精度が落ちる場合がある。
async function geocodeWithGsi(address) {
  const url = `${GSI_GEOCODE_URL}?q=${encodeURIComponent(address)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = new Error(`国土地理院APIの呼び出しに失敗しました (status ${res.status})`);
    err.code = 'GEOCODING_REQUEST_FAILED';
    throw err;
  }

  const data = await res.json();
  const feature = data?.[0];
  if (!feature) return null;
  // GeoJSON形式のため coordinates は [経度, 緯度] の順
  const [lng, lat] = feature.geometry?.coordinates || [];
  if (lat == null || lng == null) return null;
  return { lat, lng };
}

// 住所→{lat, lng} に変換する。該当住所が見つからない場合はnullを返す
// （エラーではなく「候補ゼロ」として扱う）。
async function geocodeAddress(address) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (apiKey) return geocodeWithGoogleMaps(address, apiKey);
  return geocodeWithGsi(address);
}

module.exports = { geocodeAddress };
