import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { toast } from "sonner";

interface Note {
  _id: Id<"notes">;
  title: string;
  content: string;
  tags: string[];
  _creationTime: number;
}

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

  const handleCreateNote = async (title: string, content: string, tags: string[]) => {
    try {
      await createNote({ title, content, tags });
      setIsCreating(false);
      toast.success("Đã tạo ghi chú mới!");
    } catch (error) {
      toast.error("Lỗi khi tạo ghi chú");
    }
  };

  const handleUpdateNote = async (id: Id<"notes">, title: string, content: string, tags: string[]) => {
    try {
      await updateNote({ id, title, content, tags });
      setEditingNote(null);
      toast.success("Đã cập nhật ghi chú!");
    } catch (error) {
      toast.error("Lỗi khi cập nhật ghi chú");
    }
  };

  const handleDeleteNote = async (id: Id<"notes">) => {
    if (confirm("Bạn có chắc chắn muốn xóa ghi chú này?")) {
      try {
        await deleteNote({ id });
        toast.success("Đã xóa ghi chú!");
      } catch (error) {
        toast.error("Lỗi khi xóa ghi chú");
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ghi chú của bạn</h1>
            <p className="text-gray-600">Quản lý ghi chú một cách dễ dàng</p>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <span>+</span>
            Tạo ghi chú mới
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Tìm kiếm ghi chú..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <div className="sm:w-48">
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="">Tất cả thẻ</option>
              {allTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Create/Edit Form */}
      {(isCreating || editingNote) && (
        <NoteForm
          note={editingNote}
          onSave={editingNote ? 
            (title, content, tags) => handleUpdateNote(editingNote._id, title, content, tags) :
            handleCreateNote
          }
          onCancel={() => {
            setIsCreating(false);
            setEditingNote(null);
          }}
        />
      )}

      {/* Notes List */}
      <div className="space-y-4">
        {notes.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            <div className="text-gray-400 text-6xl mb-4">📝</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery || selectedTag ? "Không tìm thấy ghi chú" : "Chưa có ghi chú nào"}
            </h3>
            <p className="text-gray-600">
              {searchQuery || selectedTag ? 
                "Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc" : 
                "Hãy tạo ghi chú đầu tiên của bạn!"
              }
            </p>
          </div>
        ) : (
          notes.map((note) => (
            <NoteCard
              key={note._id}
              note={note}
              onEdit={() => setEditingNote(note)}
              onDelete={() => handleDeleteNote(note._id)}
            />
          ))
        )}
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
  onSave: (title: string, content: string, tags: string[]) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(note?.title || "");
  const [content, setContent] = useState(note?.content || "");
  const [tagsInput, setTagsInput] = useState(note?.tags.join(", ") || "");

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

    onSave(title.trim(), content.trim(), tags);
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
