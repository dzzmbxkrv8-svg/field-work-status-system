// 住所文字列を緯度経度に変換するサービス（Google Maps Geocoding API）。
// 利用にはサーバー環境変数 GOOGLE_MAPS_API_KEY の設定が必要。
// 未設定の場合は GEOCODING_NOT_CONFIGURED エラーを投げる。

const GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

// 住所→{lat, lng} に変換する。該当住所が見つからない場合はnullを返す
// （エラーではなく「候補ゼロ」として扱う）。
async function geocodeAddress(address) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    const err = new Error('GOOGLE_MAPS_API_KEY が設定されていません');
    err.code = 'GEOCODING_NOT_CONFIGURED';
    throw err;
  }

  const url = `${GEOCODE_URL}?address=${encodeURIComponent(address)}&language=ja&region=jp&key=${apiKey}`;
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

module.exports = { geocodeAddress };
