// Next build가 server env를 정적으로 박제하지 않도록 runtime key 조회를 사용한다.
export function readRuntimeEnv(key: string): string {
    return process.env[key] ?? "";
}

export function readRuntimePasswordHashEnv(): string {
    return readRuntimeEnv("AUTH_ADMIN_PASSWORD_HASH").replace(/\\\$/g, "$");
}
