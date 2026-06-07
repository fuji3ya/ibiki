// 端末内専用の軽量 ID 生成（サーバなしなので衝突耐性は実用十分でよい）。
export function uid(prefix = ''): string {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 10);
  return `${prefix}${t}-${r}`;
}
