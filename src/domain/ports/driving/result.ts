/**
 * Driving Port で使用する Result 型の最小定義。
 * application/shared/result.ts の Ok/Err と構造的に互換。
 * domain 層が application 層に依存しないようにするため、ここで定義する。
 */
export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };
