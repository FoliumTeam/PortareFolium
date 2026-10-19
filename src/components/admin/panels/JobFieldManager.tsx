"use client";
import { LocalizedText, LocalizedElement } from "@/components/LocalizedText";

import { useState } from "react";
import Picker from "@/components/LocalizedEmojiPicker";
import data from "@emoji-mart/data";
import { toast } from "sonner";
import { Globe2, Pencil, Plus, Trash2 } from "lucide-react";
import {
    addSiteJobField as raw_addSiteJobField,
    deleteSiteJobField as raw_deleteSiteJobField,
    updateSiteJobField as raw_updateSiteJobField,
} from "@/app/admin/actions/site-config";
import { dedupeJobFieldsById } from "@/lib/job-field";
import { Button } from "@/components/ui/button";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { bindContentAction } from "@/lib/admin-content-state";
const addSiteJobField = bindContentAction(raw_addSiteJobField);
const deleteSiteJobField = bindContentAction(raw_deleteSiteJobField);
const updateSiteJobField = bindContentAction(raw_updateSiteJobField);

export type JobFieldItem = {
    id: string;
    name: string;
    emoji: string;
    headerTitle?: string;
};

type JobFieldManagerProps = {
    jobFields: JobFieldItem[];
    onChanged: (jobFields: JobFieldItem[]) => void;
};

export default function JobFieldManager({
    jobFields,
    onChanged,
}: JobFieldManagerProps) {
    const { confirm } = useConfirmDialog();
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [newName, setNewName] = useState("");
    const [newHeaderTitle, setNewHeaderTitle] = useState("");
    const [newEmoji, setNewEmoji] = useState("✨");
    const [inheritFrom, setInheritFrom] = useState("");
    const [showNewPicker, setShowNewPicker] = useState(false);
    const [editingName, setEditingName] = useState("");
    const [editingHeaderTitle, setEditingHeaderTitle] = useState("");
    const [editingEmoji, setEditingEmoji] = useState("");
    const [showEditingPicker, setShowEditingPicker] = useState(false);
    const [saving, setSaving] = useState(false);

    const selected = jobFields.find((field) => field.id === selectedId) ?? null;

    const select = (field: JobFieldItem) => {
        setSelectedId(field.id);
        setEditingName(field.name);
        setEditingHeaderTitle(field.headerTitle ?? field.name);
        setEditingEmoji(field.emoji);
        setShowEditingPicker(false);
    };

    const updateFields = (fields: JobFieldItem[]) =>
        onChanged(dedupeJobFieldsById(fields));

    const create = async () => {
        if (!newName.trim() || !newHeaderTitle.trim()) return;
        setSaving(true);
        const result = await addSiteJobField({
            name: newName,
            emoji: newEmoji,
            headerTitle: newHeaderTitle,
            inheritFrom,
        });
        setSaving(false);
        if (!result.success) {
            toast.error(<LocalizedText text={result.error} />);
            return;
        }
        updateFields(result.jobFields);
        setNewName("");
        setNewHeaderTitle("");
        setNewEmoji("✨");
        setInheritFrom("");
        toast.success(<LocalizedText text={"직무 분야 추가"} />);
    };

    const save = async () => {
        if (!selected || !editingName.trim() || !editingHeaderTitle.trim())
            return;
        setSaving(true);
        const result = await updateSiteJobField({
            id: selected.id,
            name: editingName,
            emoji: editingEmoji,
            headerTitle: editingHeaderTitle,
        });
        setSaving(false);
        if (!result.success) {
            toast.error(<LocalizedText text={result.error} />);
            return;
        }
        updateFields(result.jobFields);
        select(
            result.jobFields.find((field) => field.id === selected.id) ??
                selected
        );
        toast.success(<LocalizedText text={"직무 분야 저장"} />);
    };

    const remove = async (field: JobFieldItem) => {
        const approved = await confirm({
            title: "직무 분야 삭제",
            description: `“${field.name}”과 연결된 콘텐츠 분류를 정리합니다. 연결 지원 프로필이 있으면 삭제가 차단됩니다.`,
            confirmText: "삭제",
            cancelText: "취소",
            variant: "destructive",
        });
        if (!approved) return;
        setSaving(true);
        const result = await deleteSiteJobField(field.id);
        setSaving(false);
        if (!result.success) {
            toast.error(<LocalizedText text={result.error} />);
            return;
        }
        updateFields(result.jobFields);
        if (selectedId === field.id) setSelectedId(null);
        toast.success(<LocalizedText text={"직무 분야 삭제"} />);
    };

    return (
        <section className="tablet:p-6 space-y-5 rounded-2xl border border-(--color-border) bg-(--color-surface) p-5">
            <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-(--color-border) bg-(--color-surface-subtle) text-(--color-accent)">
                    <Globe2 className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <div>
                    <p className="text-xs font-bold tracking-[0.16em] text-(--color-muted) uppercase">
                        <LocalizedText text={"Job fields"} />
                    </p>
                    <h2 className="mt-1 text-xl font-bold text-(--color-foreground)">
                        <LocalizedText text={"직무 분야"} />
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-(--color-muted)">
                        <LocalizedText
                            text={
                                "공개 기본 프로필의 경로와 상속 기준을 관리합니다."
                            }
                        />
                    </p>
                </div>
            </div>

            <div className="laptop:grid-cols-[minmax(0,1fr)_minmax(320px,0.7fr)] grid gap-5">
                <div className="space-y-3">
                    {jobFields.length === 0 ? (
                        <p className="rounded-2xl border border-dashed border-(--color-border) bg-(--color-surface-subtle) px-5 py-10 text-center text-sm text-(--color-muted)">
                            <LocalizedText text={"등록된 직무 분야 없음"} />
                        </p>
                    ) : (
                        jobFields.map((field) => (
                            <LocalizedElement
                                as="button"
                                messageProps={{
                                    "aria-label": {
                                        text: "{0} 직무 분야 편집",
                                        values: [field.name],
                                    },
                                }}
                                type="button"
                                key={field.id}
                                aria-pressed={selectedId === field.id}
                                aria-label={`${field.name} 직무 분야 편집`}
                                onClick={() => select(field)}
                                className={`flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition-colors ${selectedId === field.id ? "border-(--color-accent) bg-(--color-accent)/6" : "border-(--color-border) bg-(--color-surface-subtle) hover:border-(--color-accent)/45"}`}
                            >
                                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-(--color-border) bg-(--color-surface) text-2xl">
                                    {field.emoji}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block font-semibold text-(--color-foreground)">
                                        {field.name}
                                    </span>
                                    <span className="mt-1 block text-sm text-(--color-muted)">
                                        <code className="rounded bg-(--color-surface) px-1.5 py-0.5 text-xs text-(--color-foreground)">
                                            /{field.id}
                                        </code>
                                        <span className="ml-2">
                                            {field.headerTitle ?? field.name}
                                        </span>
                                    </span>
                                </span>
                                <Pencil className="mt-1 h-4 w-4 text-(--color-muted)" />
                            </LocalizedElement>
                        ))
                    )}
                </div>

                <aside className="h-fit rounded-2xl border border-(--color-border) bg-(--color-surface-subtle) p-5">
                    {selected ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between gap-3">
                                <p className="font-semibold text-(--color-foreground)">
                                    <LocalizedText text={"직무 분야 편집"} />
                                </p>
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => void remove(selected)}
                                    disabled={saving}
                                >
                                    <Trash2 className="mr-1 h-4 w-4" />
                                    <LocalizedText text={" 삭제"} />
                                </Button>
                            </div>
                            <EmojiPicker
                                value={editingEmoji}
                                open={showEditingPicker}
                                onToggle={() =>
                                    setShowEditingPicker((open) => !open)
                                }
                                onSelect={(emoji) => {
                                    setEditingEmoji(emoji);
                                    setShowEditingPicker(false);
                                }}
                            />
                            <FieldInputs
                                name={editingName}
                                headerTitle={editingHeaderTitle}
                                onNameChange={setEditingName}
                                onHeaderTitleChange={setEditingHeaderTitle}
                            />
                            <Button
                                className="w-full bg-(--color-accent) text-white hover:bg-(--color-accent)/85"
                                onClick={() => void save()}
                                disabled={
                                    saving ||
                                    !editingName.trim() ||
                                    !editingHeaderTitle.trim()
                                }
                            >
                                <LocalizedText text={"저장"} />
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <p className="font-semibold text-(--color-foreground)">
                                    <LocalizedText text={"새 직무 분야"} />
                                </p>
                                <p className="mt-1 text-sm leading-6 text-(--color-muted)">
                                    <LocalizedText
                                        text={
                                            "기존 분야의 콘텐츠를 선택해 상속 시작점으로 사용 가능"
                                        }
                                    />
                                </p>
                            </div>
                            <EmojiPicker
                                value={newEmoji}
                                open={showNewPicker}
                                onToggle={() =>
                                    setShowNewPicker((open) => !open)
                                }
                                onSelect={(emoji) => {
                                    setNewEmoji(emoji);
                                    setShowNewPicker(false);
                                }}
                            />
                            <FieldInputs
                                name={newName}
                                headerTitle={newHeaderTitle}
                                onNameChange={setNewName}
                                onHeaderTitleChange={setNewHeaderTitle}
                            />
                            {jobFields.length > 0 && (
                                <label className="grid gap-2 text-sm font-semibold text-(--color-foreground)">
                                    <LocalizedText text={"상속 시작점"} />
                                    <select
                                        value={inheritFrom}
                                        onChange={(event) =>
                                            setInheritFrom(event.target.value)
                                        }
                                        className="h-11 rounded-xl border border-(--color-border) bg-(--color-surface) px-3 text-sm font-normal"
                                    >
                                        <option value="">
                                            <LocalizedText text={"없음"} />
                                        </option>
                                        {jobFields.map((field) => (
                                            <option
                                                key={field.id}
                                                value={field.id}
                                            >
                                                {field.emoji} {field.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            )}
                            <Button
                                className="w-full bg-(--color-accent) text-white hover:bg-(--color-accent)/85"
                                onClick={() => void create()}
                                disabled={
                                    saving ||
                                    !newName.trim() ||
                                    !newHeaderTitle.trim()
                                }
                            >
                                <Plus className="mr-1 h-4 w-4" />
                                <LocalizedText text={" 직무 분야 추가"} />
                            </Button>
                        </div>
                    )}
                </aside>
            </div>
        </section>
    );
}

function FieldInputs({
    name,
    headerTitle,
    onNameChange,
    onHeaderTitleChange,
}: {
    name: string;
    headerTitle: string;
    onNameChange: (value: string) => void;
    onHeaderTitleChange: (value: string) => void;
}) {
    return (
        <>
            <div className="grid gap-2 text-sm font-semibold text-(--color-foreground)">
                <Label>
                    <LocalizedText text={"프로필 이름"} />
                </Label>
                <Input
                    value={name}
                    onChange={(event) => onNameChange(event.target.value)}
                />
            </div>
            <div className="grid gap-2 text-sm font-semibold text-(--color-foreground)">
                <Label>
                    <LocalizedText text={"Header 제목"} />
                </Label>
                <Input
                    value={headerTitle}
                    onChange={(event) =>
                        onHeaderTitleChange(event.target.value)
                    }
                />
            </div>
        </>
    );
}

function EmojiPicker({
    value,
    open,
    onToggle,
    onSelect,
}: {
    value: string;
    open: boolean;
    onToggle: () => void;
    onSelect: (emoji: string) => void;
}) {
    return (
        <div className="relative">
            <LocalizedElement
                as={Button}
                translatedProps={["aria-label"]}
                type="button"
                variant="secondary"
                onClick={onToggle}
                aria-label="직무 분야 이모지 선택"
            >
                <span className="text-xl">{value}</span>
                <span className="ml-2">
                    <LocalizedText text={"이모지"} />
                </span>
            </LocalizedElement>
            {open && (
                <div className="absolute top-12 left-0 z-50">
                    <Picker
                        data={data}
                        onEmojiSelect={(emoji: { native: string }) =>
                            onSelect(emoji.native)
                        }
                        previewPosition="none"
                        skinTonePosition="none"
                    />
                </div>
            )}
        </div>
    );
}
