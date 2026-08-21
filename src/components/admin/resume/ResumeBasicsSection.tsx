"use client";

import type { ChangeEvent } from "react";
import { Figma, Github, Gitlab, Link, Linkedin, Package } from "lucide-react";
import type {
    ResumeBasics,
    ResumeProfile,
    ResumeProfilePreset,
} from "@/types/resume";
import {
    getResumeProfileBrand,
    inferResumeProfilePreset,
} from "@/lib/resume-profile-preset";
import {
    InputField,
    TextAreaField,
} from "@/components/admin/resume/ResumeEditorFields";

type ResumeBasicsSectionProps = {
    basics: ResumeBasics | undefined;
    uploadingImage: boolean;
    onImageChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onChange: (basics: ResumeBasics) => void;
};

const emptyProfile = (): ResumeProfile => ({
    network: "",
    username: "",
    url: "",
    preset: "custom",
});

export const ResumeBasicsSection = ({
    basics,
    uploadingImage,
    onImageChange,
    onChange,
}: ResumeBasicsSectionProps) => {
    const value = basics ?? {};
    const update = (patch: Partial<ResumeBasics>) =>
        onChange({ ...value, ...patch });
    const profiles = value.profiles ?? [];
    const countryCode = value.location?.countryCode ?? "";

    const updateProfile = (index: number, patch: Partial<ResumeProfile>) => {
        const next = [...profiles];
        next[index] = { ...next[index], ...patch };
        update({ profiles: next });
    };

    const moveProfile = (from: number, to: number) => {
        if (to < 0 || to >= profiles.length) return;
        const next = [...profiles];
        const [profile] = next.splice(from, 1);
        next.splice(to, 0, profile);
        update({ profiles: next });
    };

    const applyProfilePreset = (index: number, preset: ResumeProfilePreset) => {
        const profile = profiles[index];
        const brand = getResumeProfileBrand({ preset });
        updateProfile(index, {
            preset,
            network: preset === "custom" ? profile.network : brand.label,
        });
    };

    const imageClass =
        value.imageStyle === "rounded"
            ? "rounded-full"
            : value.imageStyle === "squared"
              ? "rounded-none"
              : "rounded-md";

    return (
        <section
            data-resume-section="basics"
            className="space-y-6 rounded-xl border border-(--color-border) bg-(--color-surface) p-6"
        >
            <div>
                <p className="text-xs font-bold tracking-[0.16em] text-(--color-muted) uppercase">
                    Personal data
                </p>
                <h3 className="mt-1 text-xl font-bold text-(--color-foreground)">
                    기본 정보
                </h3>
                <p className="mt-1 text-sm text-(--color-muted)">
                    공개 Resume에 사용하는 공통 개인 데이터입니다.
                </p>
            </div>

            <div className="rounded-xl border border-(--color-border) bg-(--color-surface-subtle) p-4">
                <p className="mb-4 text-base font-semibold text-(--color-foreground)">
                    프로필
                </p>
                <div className="tablet:flex-row tablet:gap-6 flex flex-col items-start gap-4">
                    {value.image ? (
                        <img
                            src={value.image}
                            alt="프로필 사진 미리보기"
                            className={`h-32 w-32 shrink-0 border border-(--color-border) object-cover ${imageClass}`}
                        />
                    ) : null}
                    <div className="min-w-0 flex-1 space-y-4">
                        <div>
                            <label className="text-sm font-medium text-(--color-muted)">
                                프로필 사진
                            </label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={onImageChange}
                                disabled={uploadingImage}
                                className="mt-2 block max-w-full cursor-pointer rounded-lg border-2 border-(--color-border) px-4 py-2 text-sm font-semibold text-(--color-foreground) file:mr-4 file:rounded-lg file:border-0 file:bg-(--color-surface) file:px-4 file:py-2 file:text-sm file:font-semibold file:text-(--color-foreground) hover:file:bg-(--color-border) disabled:opacity-50"
                            />
                        </div>
                        <InputField
                            label="사진 URL"
                            value={value.image ?? ""}
                            onChange={(image) => update({ image })}
                            placeholder="https://..."
                        />
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium text-(--color-muted)">
                                사진 형태
                            </label>
                            <select
                                value={value.imageStyle ?? "standard"}
                                onChange={(event) =>
                                    update({
                                        imageStyle: event.target
                                            .value as NonNullable<
                                            ResumeBasics["imageStyle"]
                                        >,
                                    })
                                }
                                className="rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm text-(--color-foreground)"
                            >
                                <option value="rounded">원형</option>
                                <option value="standard">둥근 사각형</option>
                                <option value="squared">사각형</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <div className="rounded-xl border border-(--color-border) bg-(--color-surface-subtle) p-4">
                <p className="mb-4 text-base font-semibold text-(--color-foreground)">
                    이름과 연락처
                </p>
                <div className="tablet:grid-cols-2 grid grid-cols-1 gap-4">
                    <InputField
                        label="이름"
                        value={value.name ?? ""}
                        onChange={(name) => update({ name })}
                    />
                    <InputField
                        label="이메일"
                        value={value.email ?? ""}
                        onChange={(email) => update({ email })}
                        type="email"
                    />
                    <InputField
                        label="전화번호"
                        value={value.phone ?? ""}
                        onChange={(phone) => update({ phone })}
                        type="tel"
                    />
                    <InputField
                        label="웹사이트 URL"
                        value={value.url ?? ""}
                        onChange={(url) => update({ url })}
                        type="url"
                    />
                </div>
            </div>

            <div className="rounded-xl border border-(--color-border) bg-(--color-surface-subtle) p-4">
                <p className="mb-4 text-base font-semibold text-(--color-foreground)">
                    위치와 개인 사항
                </p>
                <div>
                    <label
                        htmlFor="resume-country-code"
                        className="text-sm font-medium text-(--color-muted)"
                    >
                        국가
                    </label>
                    <select
                        id="resume-country-code"
                        value={countryCode}
                        onChange={(event) =>
                            update({
                                location: {
                                    ...value.location,
                                    countryCode: event.target.value,
                                },
                            })
                        }
                        className="mt-1 w-full rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm text-(--color-foreground)"
                    >
                        <option value="">국가 선택</option>
                        <option value="KR">대한민국</option>
                        <option value="US">미국</option>
                    </select>
                    <p className="mt-1 text-sm leading-6 text-(--color-muted)">
                        국가를 먼저 선택하면 해당 국가에 맞는 주소 입력 항목이
                        표시됩니다.
                    </p>
                </div>

                {countryCode === "KR" ? (
                    <div className="tablet:grid-cols-2 mt-4 grid grid-cols-1 gap-4">
                        <InputField
                            label="도로명 주소"
                            value={value.location?.address ?? ""}
                            onChange={(address) =>
                                update({
                                    location: { ...value.location, address },
                                })
                            }
                            placeholder="예: 세종대로 110"
                        />
                        <InputField
                            label="상세 주소"
                            value={value.location?.addressDetail ?? ""}
                            onChange={(addressDetail) =>
                                update({
                                    location: {
                                        ...value.location,
                                        addressDetail,
                                    },
                                })
                            }
                            placeholder="예: 101동 1001호"
                        />
                        <InputField
                            label="시/군/구"
                            value={value.location?.city ?? ""}
                            onChange={(city) =>
                                update({
                                    location: { ...value.location, city },
                                })
                            }
                        />
                        <InputField
                            label="시/도"
                            value={value.location?.region ?? ""}
                            onChange={(region) =>
                                update({
                                    location: { ...value.location, region },
                                })
                            }
                        />
                        <InputField
                            label="우편번호"
                            value={value.location?.postalCode ?? ""}
                            onChange={(postalCode) =>
                                update({
                                    location: {
                                        ...value.location,
                                        postalCode,
                                    },
                                })
                            }
                        />
                    </div>
                ) : countryCode === "US" ? (
                    <div className="tablet:grid-cols-2 mt-4 grid grid-cols-1 gap-4">
                        <InputField
                            label="Street address"
                            value={value.location?.address ?? ""}
                            onChange={(address) =>
                                update({
                                    location: { ...value.location, address },
                                })
                            }
                            placeholder="예: 123 Main Street"
                        />
                        <InputField
                            label="Apt, suite, unit"
                            value={value.location?.addressDetail ?? ""}
                            onChange={(addressDetail) =>
                                update({
                                    location: {
                                        ...value.location,
                                        addressDetail,
                                    },
                                })
                            }
                        />
                        <InputField
                            label="City"
                            value={value.location?.city ?? ""}
                            onChange={(city) =>
                                update({
                                    location: { ...value.location, city },
                                })
                            }
                        />
                        <InputField
                            label="State"
                            value={value.location?.region ?? ""}
                            onChange={(region) =>
                                update({
                                    location: { ...value.location, region },
                                })
                            }
                            placeholder="예: CA"
                        />
                        <InputField
                            label="ZIP code"
                            value={value.location?.postalCode ?? ""}
                            onChange={(postalCode) =>
                                update({
                                    location: {
                                        ...value.location,
                                        postalCode,
                                    },
                                })
                            }
                        />
                    </div>
                ) : null}

                <div className="tablet:grid-cols-2 mt-4 grid grid-cols-1 gap-4">
                    <InputField
                        label="생년월일"
                        value={value.birthDate ?? ""}
                        onChange={(birthDate) => update({ birthDate })}
                        type="date"
                    />
                    <InputField
                        label="병역 상태"
                        value={value.military?.status ?? ""}
                        onChange={(status) =>
                            update({ military: { ...value.military, status } })
                        }
                        placeholder="예: 육군 병장 만기전역"
                    />
                    <InputField
                        label="복무 시작월"
                        value={value.military?.startDate ?? ""}
                        onChange={(startDate) =>
                            update({
                                military: { ...value.military, startDate },
                            })
                        }
                        type="month"
                    />
                    <InputField
                        label="복무 종료월"
                        value={value.military?.endDate ?? ""}
                        onChange={(endDate) =>
                            update({ military: { ...value.military, endDate } })
                        }
                        type="month"
                    />
                </div>
            </div>

            <div className="rounded-xl border border-(--color-border) bg-(--color-surface-subtle) p-4">
                <div className="flex items-center justify-between gap-3">
                    <p className="text-base font-semibold text-(--color-foreground)">
                        외부 프로필
                    </p>
                    <button
                        type="button"
                        onClick={() =>
                            update({ profiles: [...profiles, emptyProfile()] })
                        }
                        className="rounded-lg bg-(--color-accent) px-3 py-2 text-sm font-semibold whitespace-nowrap text-(--color-on-accent)"
                    >
                        프로필 추가
                    </button>
                </div>
                <div className="mt-4 space-y-3">
                    <p className="text-sm leading-6 text-(--color-muted)">
                        preset은 공개 버튼의 브랜드 색상과 icon을 정합니다.
                        Custom은 목록에 없는 서비스용 중립 버튼이며 서비스 표시
                        이름을 직접 입력합니다. 표시 이름은 버튼 문구, URL은
                        이동 주소입니다.
                    </p>
                    <p className="text-sm leading-6 text-(--color-muted)">
                        위·아래 버튼은 공개 Resume에서 프로필 버튼의 표시 순서를
                        한 칸씩 바꿉니다.
                    </p>
                    {profiles.map((profile, index) => {
                        const activePreset = inferResumeProfilePreset(profile);
                        const activeBrand = getResumeProfileBrand(profile);
                        const isCustom = activePreset === "custom";
                        return (
                            <div
                                key={index}
                                className="rounded-lg border border-(--color-border) bg-(--color-surface) p-3"
                            >
                                <div className="mb-3">
                                    <p className="text-sm font-medium text-(--color-muted)">
                                        플랫폼 preset
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {(
                                            [
                                                "github",
                                                "gitlab",
                                                "linkedin",
                                                "figma",
                                                "npm",
                                                "custom",
                                            ] as const
                                        ).map((preset) => {
                                            const brand = getResumeProfileBrand(
                                                {
                                                    preset,
                                                }
                                            );
                                            const selected =
                                                activePreset === preset;
                                            return (
                                                <button
                                                    key={preset}
                                                    type="button"
                                                    aria-pressed={selected}
                                                    onClick={() =>
                                                        applyProfilePreset(
                                                            index,
                                                            preset
                                                        )
                                                    }
                                                    style={{
                                                        backgroundColor:
                                                            brand.backgroundColor,
                                                        color: brand.foregroundColor,
                                                    }}
                                                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold whitespace-nowrap transition-opacity hover:opacity-85 ${
                                                        selected
                                                            ? "ring-2 ring-(--color-accent) ring-offset-2 ring-offset-(--color-surface)"
                                                            : "opacity-70"
                                                    }`}
                                                >
                                                    <ProfilePresetIcon
                                                        preset={preset}
                                                    />
                                                    {brand.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <p className="mt-3 text-sm leading-6 text-(--color-muted)">
                                        {isCustom
                                            ? "Custom 선택: 목록에 없는 서비스의 표시 이름을 직접 입력합니다."
                                            : `${activeBrand.label} 선택: 서비스명은 preset으로 자동 설정되며 버튼 색상과 icon에 사용됩니다.`}
                                    </p>
                                </div>
                                <div
                                    className={`grid grid-cols-1 gap-3 ${
                                        isCustom
                                            ? "tablet:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
                                            : "tablet:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
                                    }`}
                                >
                                    {isCustom ? (
                                        <InputField
                                            label="서비스 표시 이름"
                                            value={profile.network ?? ""}
                                            onChange={(network) =>
                                                updateProfile(index, {
                                                    network,
                                                })
                                            }
                                            placeholder="예: Dev.to"
                                        />
                                    ) : null}
                                    <InputField
                                        label="버튼 표시 이름"
                                        value={profile.username ?? ""}
                                        onChange={(username) =>
                                            updateProfile(index, { username })
                                        }
                                    />
                                    <InputField
                                        label="프로필 URL"
                                        value={profile.url ?? ""}
                                        onChange={(url) =>
                                            updateProfile(index, { url })
                                        }
                                        type="url"
                                    />
                                    <div className="flex items-end gap-2">
                                        <button
                                            type="button"
                                            aria-label={`${profile.network || activeBrand.label} 프로필을 한 칸 위로 이동`}
                                            title="공개 Resume에서 이 버튼을 한 칸 위로 이동"
                                            onClick={() =>
                                                moveProfile(index, index - 1)
                                            }
                                            disabled={index === 0}
                                            className="rounded-lg border border-(--color-border) px-3 py-2 text-sm font-semibold text-(--color-foreground) disabled:opacity-40"
                                        >
                                            위
                                        </button>
                                        <button
                                            type="button"
                                            aria-label={`${profile.network || activeBrand.label} 프로필을 한 칸 아래로 이동`}
                                            title="공개 Resume에서 이 버튼을 한 칸 아래로 이동"
                                            onClick={() =>
                                                moveProfile(index, index + 1)
                                            }
                                            disabled={
                                                index === profiles.length - 1
                                            }
                                            className="rounded-lg border border-(--color-border) px-3 py-2 text-sm font-semibold text-(--color-foreground) disabled:opacity-40"
                                        >
                                            아래
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                update({
                                                    profiles: profiles.filter(
                                                        (_, itemIndex) =>
                                                            itemIndex !== index
                                                    ),
                                                })
                                            }
                                            className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white"
                                        >
                                            삭제
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <TextAreaField
                label="공통 자기소개"
                value={value.summary ?? ""}
                onChange={(summary) => update({ summary })}
                rows={4}
            />
        </section>
    );
};

const ProfilePresetIcon = ({ preset }: { preset: ResumeProfilePreset }) => {
    if (preset === "github") return <Github className="h-4 w-4" />;
    if (preset === "gitlab") return <Gitlab className="h-4 w-4" />;
    if (preset === "linkedin") return <Linkedin className="h-4 w-4" />;
    if (preset === "figma") return <Figma className="h-4 w-4" />;
    if (preset === "npm") return <Package className="h-4 w-4" />;
    return <Link className="h-4 w-4" />;
};
