/**
 * Driving Port で使用する Result 型の最小定義。
 * application/shared/result.ts の Ok/Err と構造的に互換。
 * domain 層が application 層に依存しないようにするため、ここで定義する。
 */
export type Result<T, E> =
  | { readonly isOk: () => true; readonly isErr: () => false; readonly value: T }
  | { readonly isOk: () => false; readonly isErr: () => true; readonly error: E };
