import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id, Doc } from "../convex/_generated/dataModel";
import { toast } from "sonner";

type Note = Doc<"notes">;

export function NotesApp() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  const notes = useQuery(api.notes.search, { 
    query: searchQuery, 
    tag: selectedTag || undefined 
  }) || [];
  const allTags = useQuery(api.notes.getAllTags) || [];

  const createNote = useMutation(api.notes.create);
  const updateNote = useMutation(api.notes.update);
  const deleteNote = useMutation(api.notes.remove);
  const generateUploadUrl = useMutation(api.notes.generateUploadUrl);

  const handleCreateNote = async (title: string, content: string, tags: string[], file?: File, imageUrl?: string) => {
    try {
      let storageId: Id<"_storage"> | undefined = undefined;
      if (file) {
        const postUrl = await generateUploadUrl();
        const result = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        const { storageId: newStorageId } = await result.json();
        storageId = newStorageId;
      }

      await createNote({ title, content, tags, storageId, imageUrl });
      setIsCreating(false);
      toast.success("Đã tạo ghi chú mới!");
    } catch (error) {
      console.error(error);
      toast.error("Lỗi khi tạo ghi chú");
    }
  };

  const handleUpdateNote = async (id: Id<"notes">, title: string, content: string, tags: string[], file?: File, imageUrl?: string) => {
    try {
      // Start with the original image/file values
      let finalStorageId: Id<"_storage"> | undefined = editingNote?.storageId;
      let finalImageUrl: string | undefined = editingNote?.imageUrl;

      // Has the user provided a new file?
      if (file) {
        const postUrl = await generateUploadUrl();
        const result = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        const { storageId } = await result.json();
        finalStorageId = storageId;
        finalImageUrl = undefined; // New file takes precedence
      } 
      // If no new file, has the user changed the image URL?
      else if (imageUrl !== editingNote?.imageUrl) {
        finalImageUrl = imageUrl;
        finalStorageId = undefined; // New URL takes precedence
      }

      await updateNote({ 
        id, 
        title, 
        content, 
        tags, 
        storageId: finalStorageId, 
        imageUrl: finalImageUrl 
      });

      setEditingNote(null);
      toast.success("Đã cập nhật ghi chú!");
    } catch (error) {
      console.error(error);
      toast.error("Lỗi khi cập nhật ghi chú");
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8 font-sans">
      <header className="text-center mb-10">
        <h1 className="text-5xl font-extrabold text-gray-800 tracking-tight">
          Ghi Chú Tiếng Việt
        </h1>
        <p className="text-xl text-gray-500 mt-3">
          Lưu giữ mọi ý tưởng, mọi lúc, mọi nơi.
        </p>
      </header>

      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 items-center">
          <input
            type="text"
            placeholder="🔍 Tìm kiếm ghi chú..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="md:col-span-2 w-full px-5 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
          />
          <div className="relative">
            <select 
              value={selectedTag} 
              onChange={(e) => setSelectedTag(e.target.value)}
              className="w-full appearance-none bg-white px-5 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            >
              <option value="">Tất cả thẻ</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-10">
          {isCreating || editingNote ? (
            <NoteForm
              note={editingNote}
              onSave={(title, content, tags, file, imageUrl) => {
                if (editingNote) {
                  handleUpdateNote(editingNote._id, title, content, tags, file, imageUrl);
                } else {
                  handleCreateNote(title, content, tags, file, imageUrl);
                }
              }}
              onCancel={() => {
                setIsCreating(false);
                setEditingNote(null);
              }}
            />
          ) : (
            <div className="text-center">
              <button 
                onClick={() => setIsCreating(true)} 
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-bold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
              >
                + Tạo ghi chú mới
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {notes.map((note) => (
            <NoteCard
              key={note._id}
              note={note}
              onEdit={() => setEditingNote(note)}
              onDelete={async () => {
                try {
                  await deleteNote({ id: note._id });
                  toast.success("Đã xóa ghi chú!");
                } catch (error) {
                  console.error(error);
                  toast.error("Lỗi khi xóa ghi chú");
                }
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function NoteForm({ 
  note, 
  onSave, 
  onCancel 
}: { 
  note?: Note | null;
  onSave: (title: string, content: string, tags: string[], file?: File, imageUrl?: string) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(note?.title || "");
  const [content, setContent] = useState(note?.content || "");
  const [tagsInput, setTagsInput] = useState(note?.tags.join(", ") || "");
  const [file, setFile] = useState<File | undefined>(undefined);
  const [imageUrl, setImageUrl] = useState(note?.imageUrl || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error("Vui lòng nhập tiêu đề và nội dung");
      return;
    }

    const tags = tagsInput
      .split(",")
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    onSave(title.trim(), content.trim(), tags, file, imageUrl);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        {note ? "Chỉnh sửa ghi chú" : "Tạo ghi chú mới"}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="text"
            placeholder="Tiêu đề ghi chú..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-lg font-medium"
          />
        </div>
        <div>
          <textarea
            placeholder="Nội dung ghi chú..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
          />
        </div>
        <div>
          <input
            type="text"
            placeholder="Thẻ (phân cách bằng dấu phẩy)..."
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
          <p className="text-sm text-gray-500 mt-1">
            Ví dụ: công việc, cá nhân, ý tưởng
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Đính kèm ảnh
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0])}
            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Hoặc dán URL ảnh
          </label>
          <input
            type="text"
            placeholder="https://example.com/image.png"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            {note ? "Cập nhật" : "Tạo ghi chú"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Hủy
          </button>
        </div>
      </form>
    </div>
  );
}

function NoteCard({
  note,
  onEdit,
  onDelete 
}: {
  note: Note;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-semibold text-gray-900 flex-1 mr-4">
            {note.title}
          </h3>
          <div className="flex gap-2">
            <button
              onClick={onEdit}
              className="text-blue-600 hover:text-blue-700 p-1 rounded"
              title="Chỉnh sửa"
            >
              ✏️
            </button>
            <button
              onClick={onDelete}
              className="text-red-600 hover:text-red-700 p-1 rounded"
              title="Xóa"
            >
              🗑️
            </button>
          </div>
        </div>
        
        <p className="text-gray-700 mb-4 whitespace-pre-wrap leading-relaxed">
          {note.content}
        </p>

        {note.imageUrl && (
          <div className="mb-4 relative">
            <img 
              src={note.imageUrl}
              alt={note.title}
              className="rounded-lg max-h-48 cursor-pointer" 
              onMouseEnter={() => setIsPreviewOpen(true)}
              onMouseLeave={() => setIsPreviewOpen(false)}
            />
            {isPreviewOpen && (
              <div 
                className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
                onMouseEnter={() => setIsPreviewOpen(true)}
                onMouseLeave={() => setIsPreviewOpen(false)}
              >
                <img 
                  src={note.imageUrl} 
                  alt="Xem trước" 
                  className="max-w-full max-h-full rounded-lg shadow-2xl object-contain"
                />
              </div>
            )}
          </div>
        )}
        
        <div className="flex flex-wrap gap-2 mb-3">
          {note.tags.map((tag) => (
            <span
              key={tag}
              className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium"
            >
              #{tag}
            </span>
          ))}
        </div>
        
        <div className="text-sm text-gray-500">
          {formatDate(note._creationTime)}
        </div>
      </div>
    </div>
  );
}
