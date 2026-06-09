/**
 * いびき — RevenueCat client wrapper（Mirrorbite lib/purchases.ts から流用）
 *
 * RC project `ibiki`: entitlement `pro` に ib_weekly_v1 / ib_annual_v1 を attach。
 * RC key 未設定時は mock entitlement モード（paywall UX を実機なしで検証可）。
 * 価格は必ず StoreKit ライブ値を表示する（ハードコード禁止 — fallback のみ定数）。
 */

import Purchases, { LOG_LEVEL, type PurchasesOffering } from 'react-native-purchases';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageKeys } from './storage-keys';

const RC_API_KEY_IOS = process.env.EXPO_PUBLIC_RC_API_KEY_IOS;
const RC_API_KEY_ANDROID = process.env.EXPO_PUBLIC_RC_API_KEY_ANDROID;
// RC dashboard entitlement lookup_key と一致させる（全アプリ統一 `pro`）。
const ENTITLEMENT_ID = 'pro';

const PRODUCT_WEEKLY = 'ib_weekly_v1';
const PRODUCT_ANNUAL = 'ib_annual_v1';

let initialized = false;

export async function initPurchases(userId?: string): Promise<void> {
  if (initialized) return;
  const key = Platform.OS === 'ios' ? RC_API_KEY_IOS : RC_API_KEY_ANDROID;
  if (!key) {
    console.warn('RC key missing — mock entitlement mode');
    initialized = true;
    return;
  }
  Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.INFO);
  await Purchases.configure({ apiKey: key, appUserID: userId });
  // Catch out-of-band grants (Ask-to-Buy parental approval, deferred SCA,
  // network-drop reconcile): upgrade-only refresh of the local cache.
  try {
    Purchases.addCustomerInfoUpdateListener((info) => {
      if (info.entitlements.active[ENTITLEMENT_ID]?.isActive) {
        AsyncStorage.setItem(StorageKeys.ENTITLEMENT_ACTIVE, '1').catch(() => {});
      }
    });
  } catch { /* listener is best-effort */ }
  initialized = true;
}

export async function getOfferings(): Promise<PurchasesOffering | null> {
  if (!initialized || !RC_API_KEY_IOS) return null;
  const o = await Purchases.getOfferings();
  return o.current ?? null;
}

/**
 * Paywall 用のローカライズ価格文字列。
 * RC が設定されていれば storefront 通貨の priceString を返す。未設定時は JPY fallback。
 * 年額は週換算で約68%引きの訴求アンカー（¥3,800/年 vs ¥480/週）。
 */
export async function getPlanPrices(): Promise<{ annual: string; weekly: string }> {
  const fallback = { annual: '¥3,800 / 年', weekly: '¥480 / 週' };
  if (!RC_API_KEY_IOS) return fallback;
  try {
    const offering = await getOfferings();
    const packages = offering?.availablePackages ?? [];
    const ann = packages.find((p) => p.product.identifier === PRODUCT_ANNUAL);
    const wee = packages.find((p) => p.product.identifier === PRODUCT_WEEKLY);
    return {
      annual: ann?.product.priceString ? `${ann.product.priceString} / 年` : fallback.annual,
      weekly: wee?.product.priceString ? `${wee.product.priceString} / 週` : fallback.weekly,
    };
  } catch {
    return fallback;
  }
}

export async function purchasePlan(planId: 'annual' | 'weekly'): Promise<boolean> {
  // Mock path — RC 未設定時は UX テストのため成功扱い
  if (!RC_API_KEY_IOS) {
    // Mock may only grant in development — a keyless Release build must never
    // hand out free pro (CI also asserts the key, this is defense-in-depth).
    if (!__DEV__) return false;
    await AsyncStorage.setItem(StorageKeys.ENTITLEMENT_ACTIVE, '1');
    return true;
  }
  try {
    const offering = await getOfferings();
    const packages = offering?.availablePackages ?? [];
    const productId = planId === 'annual' ? PRODUCT_ANNUAL : PRODUCT_WEEKLY;
    const pkg = packages.find((p) => p.product.identifier === productId);
    if (!pkg) throw new Error(`package_${productId}_not_found`);
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const active = customerInfo.entitlements.active[ENTITLEMENT_ID]?.isActive ?? false;
    if (active) await AsyncStorage.setItem(StorageKeys.ENTITLEMENT_ACTIVE, '1');
    return active;
  } catch (e: any) {
    if (e?.userCancelled) return false;
    console.warn('purchase failed', e);
    return false;
  }
}

export async function isPro(): Promise<boolean> {
  if (!RC_API_KEY_IOS) {
    return __DEV__ && (await AsyncStorage.getItem(StorageKeys.ENTITLEMENT_ACTIVE)) === '1';
  }
  try {
    const info = await Purchases.getCustomerInfo();
    return info.entitlements.active[ENTITLEMENT_ID]?.isActive ?? false;
  } catch {
    return false;
  }
}

export async function restorePurchases(): Promise<boolean> {
  if (!RC_API_KEY_IOS) return __DEV__ ? isPro() : false;
  try {
    const info = await Purchases.restorePurchases();
    return info.entitlements.active[ENTITLEMENT_ID]?.isActive ?? false;
  } catch {
    return false;
  }
}
