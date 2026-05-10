import { useState, useEffect, useCallback, useRef } from "react";
import {
  Layout,
  Tree,
  Button,
  Modal,
  Input,
  Upload,
  Image,
  Tooltip,
  Spin,
  Empty,
  Breadcrumb,
  Popconfirm,
  Tag,
  message,
  Space,
  Typography,
  Card,
} from "antd";
import type { DataNode } from "antd/es/tree";
import {
  FolderOutlined,
  FolderOpenOutlined,
  FolderAddOutlined,
  UploadOutlined,
  DeleteOutlined,
  CopyOutlined,
  ReloadOutlined,
  PlusOutlined,
  InboxOutlined,
} from "@ant-design/icons";
import { AdminLayout } from "../components/AdminLayout";
import {
  listFolders,
  listFiles,
  createFolder,
  deleteFolder,
  deleteFile,
  uploadFile,
  type MediaFolder,
  type MediaFile,
} from "../api/media";

const { Sider, Content } = Layout;
const { Text } = Typography;
const { Dragger } = Upload;

// ─── helpers ────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function buildTreeNodes(folders: MediaFolder[]): DataNode[] {
  return folders.map((f) => ({
    key: f.path,
    title: f.name,
    icon: ({ expanded }: { expanded: boolean }) =>
      expanded ? <FolderOpenOutlined /> : <FolderOutlined />,
    isLeaf: false, // always expandable — sub-folders loaded on demand
  }));
}

// ─── component ──────────────────────────────────────────────────────────────

export function MediaManagerPage() {
  // Tree state
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [loadedKeys, setLoadedKeys] = useState<Set<string>>(new Set());
  const [selectedFolder, setSelectedFolder] = useState<string>("");
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);

  // Files state
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);

  // UI state
  const [uploading, setUploading] = useState(false);
  const [newFolderModal, setNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [uploadModal, setUploadModal] = useState(false);
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);

  const treeRef = useRef<DataNode[]>([]);
  treeRef.current = treeData;

  // ── Load root folders on mount ─────────────────────────────────────────────
  const loadRootFolders = useCallback(async () => {
    const folders = await listFolders();
    setTreeData(buildTreeNodes(folders));
  }, []);

  useEffect(() => { void loadRootFolders(); }, [loadRootFolders]);

  // ── Load files for selected folder ────────────────────────────────────────
  const loadFiles = useCallback(async (folder: string, cursor?: string) => {
    setFilesLoading(true);
    try {
      const res = await listFiles(folder || undefined, cursor);
      if (cursor) {
        setFiles((prev) => [...prev, ...res.files]);
      } else {
        setFiles(res.files);
      }
      setNextCursor(res.next_cursor);
    } catch {
      void message.error("Не вдалося завантажити файли");
    } finally {
      setFilesLoading(false);
    }
  }, []);

  useEffect(() => {
    setFiles([]);
    setNextCursor(undefined);
    setSelectedFile(null);
    void loadFiles(selectedFolder);
  }, [selectedFolder, loadFiles]);

  // ── Tree lazy load sub-folders ─────────────────────────────────────────────
  const onLoadData = useCallback(
    async (node: DataNode): Promise<void> => {
      const key = node.key as string;
      if (loadedKeys.has(key)) return;
      const subs = await listFolders(key);
      setLoadedKeys((prev) => new Set([...prev, key]));

      // Merge into tree recursively
      const insertChildren = (nodes: DataNode[]): DataNode[] =>
        nodes.map((n) => {
          if (n.key === key) {
            return {
              ...n,
              children: buildTreeNodes(subs),
              isLeaf: subs.length === 0,
            };
          }
          if (n.children) return { ...n, children: insertChildren(n.children) };
          return n;
        });

      setTreeData((prev) => insertChildren(prev));
    },
    [loadedKeys],
  );

  // ── Create folder ──────────────────────────────────────────────────────────
  const handleCreateFolder = async () => {
    const name = newFolderName.trim().replace(/[/\\]/g, "");
    if (!name) return;
    const fullPath = selectedFolder ? `${selectedFolder}/${name}` : name;
    try {
      await createFolder(fullPath);
      void message.success(`Папку "${name}" створено`);
      setNewFolderModal(false);
      setNewFolderName("");
      // Reload tree
      setLoadedKeys(new Set());
      await loadRootFolders();
    } catch {
      void message.error("Не вдалося створити папку");
    }
  };

  // ── Delete folder ──────────────────────────────────────────────────────────
  const handleDeleteFolder = async (folderPath: string) => {
    try {
      await deleteFolder(folderPath);
      void message.success("Папку видалено");
      setSelectedFolder("");
      setLoadedKeys(new Set());
      await loadRootFolders();
    } catch {
      void message.error("Не вдалося видалити папку (можливо вона не порожня)");
    }
  };

  // ── Upload files ───────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!filesToUpload.length) return;
    setUploading(true);
    let ok = 0;
    for (const f of filesToUpload) {
      try {
        const uploaded = await uploadFile(f, selectedFolder || "uploads");
        setFiles((prev) => [uploaded as unknown as MediaFile, ...prev]);
        ok++;
      } catch {
        void message.error(`Не вдалося завантажити ${f.name}`);
      }
    }
    setUploading(false);
    setUploadModal(false);
    setFilesToUpload([]);
    if (ok > 0) void message.success(`Завантажено ${ok} файл(ів)`);
  };

  // ── Delete file ─────────────────────────────────────────────────────────────
  const handleDeleteFile = async (file: MediaFile) => {
    try {
      await deleteFile(file.public_id);
      setFiles((prev) => prev.filter((f) => f.public_id !== file.public_id));
      if (selectedFile?.public_id === file.public_id) setSelectedFile(null);
      void message.success("Файл видалено");
    } catch {
      void message.error("Не вдалося видалити файл");
    }
  };

  // ── Copy URL ─────────────────────────────────────────────────────────────
  const copyUrl = (url: string) => {
    void navigator.clipboard.writeText(url);
    void message.success("URL скопійовано");
  };

  // ── Breadcrumb from selected folder ───────────────────────────────────────
  const breadcrumbItems = [
    {
      title: (
        <a onClick={() => setSelectedFolder("")} style={{ cursor: "pointer" }}>
          Всі папки
        </a>
      ),
    },
    ...selectedFolder.split("/").map((seg, i, arr) => {
      const path = arr.slice(0, i + 1).join("/");
      const isLast = i === arr.length - 1;
      return {
        title: isLast ? seg : (
          <a onClick={() => setSelectedFolder(path)} style={{ cursor: "pointer" }}>
            {seg}
          </a>
        ),
      };
    }),
  ];

  return (
    <AdminLayout>
      <div style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            📁 Медіа-менеджер
          </Typography.Title>
          <Space>
            <Button icon={<FolderAddOutlined />} onClick={() => setNewFolderModal(true)}>
              Нова папка
            </Button>
            <Button
              type="primary"
              icon={<UploadOutlined />}
              onClick={() => setUploadModal(true)}
            >
              Завантажити фото
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                setLoadedKeys(new Set());
                void loadRootFolders();
                void loadFiles(selectedFolder);
              }}
            />
          </Space>
        </div>

        <Layout style={{ border: "1px solid #f0f0f0", borderRadius: 8, background: "#fff", minHeight: 600 }}>
          {/* Left: Folder tree */}
          <Sider width={240} style={{ background: "#fafafa", borderRight: "1px solid #f0f0f0", borderRadius: "8px 0 0 8px", padding: 8 }}>
            <div style={{ padding: "4px 8px", fontWeight: 600, color: "#888", fontSize: 11, textTransform: "uppercase", marginBottom: 4 }}>
              Папки
            </div>
            {treeData.length === 0 ? (
              <Empty description="Немає папок" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ margin: "20px 0" }} />
            ) : (
              <Tree
                showIcon
                blockNode
                loadData={onLoadData}
                treeData={treeData}
                expandedKeys={expandedKeys}
                onExpand={(keys) => setExpandedKeys(keys as string[])}
                selectedKeys={selectedFolder ? [selectedFolder] : []}
                onSelect={(keys) => {
                  const key = keys[0] as string | undefined;
                  setSelectedFolder(key ?? "");
                }}
              />
            )}

            {selectedFolder && (
              <div style={{ padding: "8px 8px 0" }}>
                <Popconfirm
                  title="Видалити папку?"
                  description="Папка має бути порожньою"
                  onConfirm={() => void handleDeleteFolder(selectedFolder)}
                  okText="Так"
                  cancelText="Ні"
                >
                  <Button danger size="small" icon={<DeleteOutlined />} block>
                    Видалити папку
                  </Button>
                </Popconfirm>
              </div>
            )}
          </Sider>

          {/* Right: Files grid */}
          <Content style={{ padding: 16 }}>
            <Breadcrumb items={breadcrumbItems} style={{ marginBottom: 12 }} />

            {filesLoading && files.length === 0 ? (
              <Spin size="large" style={{ display: "block", marginTop: 80, textAlign: "center" }} />
            ) : files.length === 0 ? (
              <Empty
                description="В цій папці немає файлів"
                style={{ marginTop: 80 }}
              >
                <Button type="primary" icon={<UploadOutlined />} onClick={() => setUploadModal(true)}>
                  Завантажити фото
                </Button>
              </Empty>
            ) : (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                    gap: 12,
                  }}
                >
                  {files.map((file) => (
                    <Card
                      key={file.public_id}
                      hoverable
                      size="small"
                      style={{
                        border: selectedFile?.public_id === file.public_id ? "2px solid #1677ff" : "1px solid #f0f0f0",
                        borderRadius: 8,
                        overflow: "hidden",
                        cursor: "pointer",
                      }}
                      onClick={() => setSelectedFile(file)}
                      cover={
                        <div style={{ height: 140, overflow: "hidden", background: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Image
                            src={file.secure_url}
                            alt={file.public_id}
                            style={{ objectFit: "contain", maxHeight: 140, width: "100%" }}
                            preview={false}
                          />
                        </div>
                      }
                      actions={[
                        <Tooltip title="Копіювати URL" key="copy">
                          <CopyOutlined onClick={(e) => { e.stopPropagation(); copyUrl(file.secure_url); }} />
                        </Tooltip>,
                        <Popconfirm
                          key="del"
                          title="Видалити файл?"
                          onConfirm={(e) => { e?.stopPropagation(); void handleDeleteFile(file); }}
                          okText="Так"
                          cancelText="Ні"
                        >
                          <DeleteOutlined style={{ color: "#ff4d4f" }} onClick={(e) => e.stopPropagation()} />
                        </Popconfirm>,
                      ]}
                    >
                      <div style={{ padding: "4px 0" }}>
                        <Text ellipsis style={{ fontSize: 11, display: "block" }}>
                          {file.public_id.split("/").pop()}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 10 }}>
                          {file.width}×{file.height} · {formatBytes(file.bytes)}
                        </Text>
                      </div>
                    </Card>
                  ))}
                </div>

                {nextCursor && (
                  <div style={{ textAlign: "center", marginTop: 16 }}>
                    <Button loading={filesLoading} onClick={() => void loadFiles(selectedFolder, nextCursor)}>
                      Завантажити ще
                    </Button>
                  </div>
                )}
              </>
            )}

            {/* Selected file detail panel */}
            {selectedFile && (
              <Card
                style={{ marginTop: 16 }}
                title={selectedFile.public_id.split("/").pop()}
                extra={
                  <Space>
                    <Button icon={<CopyOutlined />} size="small" onClick={() => copyUrl(selectedFile.secure_url)}>
                      Копіювати URL
                    </Button>
                    <Popconfirm title="Видалити файл?" onConfirm={() => void handleDeleteFile(selectedFile)} okText="Так" cancelText="Ні">
                      <Button danger size="small" icon={<DeleteOutlined />}>Видалити</Button>
                    </Popconfirm>
                  </Space>
                }
              >
                <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
                  <Image src={selectedFile.secure_url} alt={selectedFile.public_id} style={{ maxHeight: 160, maxWidth: 240, objectFit: "contain" }} />
                  <div>
                    <p><b>Public ID:</b> <Text copyable code>{selectedFile.public_id}</Text></p>
                    <p><b>Розмір:</b> {selectedFile.width}×{selectedFile.height}px</p>
                    <p><b>Вага:</b> {formatBytes(selectedFile.bytes)}</p>
                    <p><b>Формат:</b> <Tag>{selectedFile.format}</Tag></p>
                    <p><b>URL:</b> <Text copyable style={{ fontSize: 11, wordBreak: "break-all" }}>{selectedFile.secure_url}</Text></p>
                  </div>
                </div>
              </Card>
            )}
          </Content>
        </Layout>

        {/* ── New folder modal ─────────────────────────────────────────────── */}
        <Modal
          title={`Нова папка${selectedFolder ? ` в "${selectedFolder}"` : ""}`}
          open={newFolderModal}
          onOk={() => void handleCreateFolder()}
          onCancel={() => { setNewFolderModal(false); setNewFolderName(""); }}
          okText="Створити"
          cancelText="Скасувати"
        >
          <Input
            placeholder="Назва папки (напр. braces, retainers)"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onPressEnter={() => void handleCreateFolder()}
            autoFocus
          />
          {selectedFolder && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Буде створено: <code>{selectedFolder}/{newFolderName || "..."}</code>
            </Text>
          )}
        </Modal>

        {/* ── Upload modal ────────────────────────────────────────────────── */}
        <Modal
          title={`Завантажити фото${selectedFolder ? ` → "${selectedFolder}"` : " → uploads"}`}
          open={uploadModal}
          onOk={() => void handleUpload()}
          onCancel={() => { setUploadModal(false); setFilesToUpload([]); }}
          okText={uploading ? "Завантаження..." : `Завантажити (${filesToUpload.length})`}
          okButtonProps={{ disabled: filesToUpload.length === 0, loading: uploading }}
          cancelText="Скасувати"
          width={520}
        >
          {!selectedFolder && (
            <div style={{ marginBottom: 8, padding: "6px 12px", background: "#fffbe6", border: "1px solid #ffe58f", borderRadius: 6, fontSize: 12 }}>
              ⚠️ Не вибрано папку — фото потраплять у <b>uploads</b>
            </div>
          )}
          <Dragger
            multiple
            beforeUpload={(file) => {
              setFilesToUpload((prev) => [...prev, file]);
              return false; // prevent auto-upload
            }}
            onRemove={(file) => {
              setFilesToUpload((prev) => prev.filter((f) => f !== file));
            }}
            accept="image/*"
            fileList={filesToUpload.map((f, i) => ({
              uid: `${i}`,
              name: f.name,
              status: "done" as const,
              size: f.size,
            }))}
          >
            <p className="ant-upload-drag-icon"><InboxOutlined /></p>
            <p className="ant-upload-text">Перетягніть фото або натисніть</p>
            <p className="ant-upload-hint">
              Підтримуються JPG, PNG, WebP. Фото автоматично стискаються без помітної втрати якості.
            </p>
          </Dragger>
        </Modal>
      </div>
    </AdminLayout>
  );
}
