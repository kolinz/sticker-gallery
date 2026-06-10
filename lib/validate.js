/**
 * 必須フィールドの存在チェック。
 * @param {object} obj
 * @param {string[]} fields
 * @returns {{ ok: boolean, error?: string }}
 */
export function requireFields(obj, fields) {
  for (const f of fields) {
    if (obj[f] === undefined || obj[f] === null || obj[f] === '') {
      return { ok: false, error: `${f} は必須です` };
    }
  }
  return { ok: true };
}

/**
 * 英数字・ハイフンのみ、指定文字数以下かチェック。
 * @param {string} str
 * @param {number} max
 * @returns {boolean}
 */
export function isAlphaHyphen(str, max) {
  return typeof str === 'string' &&
    str.length >= 1 &&
    str.length <= max &&
    /^[a-zA-Z0-9-]+$/.test(str);
}

/**
 * 英大文字・数字のみ、指定文字数以下かチェック（area_code 用）。
 * @param {string} str
 * @param {number} max
 * @returns {boolean}
 */
export function isUpperAlphaNum(str, max) {
  return typeof str === 'string' &&
    str.length >= 1 &&
    str.length <= max &&
    /^[A-Z0-9]+$/.test(str);
}

/**
 * 列挙値に含まれるかチェック。
 * @param {*} val
 * @param {Array} values
 * @returns {boolean}
 */
export function isEnum(val, values) {
  return values.includes(val);
}

/**
 * 文字列長が範囲内かチェック。
 * @param {string} str
 * @param {number} min
 * @param {number} max
 * @returns {boolean}
 */
export function isStringRange(str, min, max) {
  return typeof str === 'string' &&
    str.length >= min &&
    str.length <= max;
}
