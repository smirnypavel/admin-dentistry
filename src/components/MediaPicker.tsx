import { useState, useEffect, useCallback } from "react";
import {
  Modal,
  Layout,
  Tree,
  Image,
  Spin,
  Empty,
  Breadcrumb,
  Button,
  Typography,
  Space,
  message,
  Badge,
} from "antd";
import type { DataNode } from "antd/es/tree";
import {
  FolderOutlined,
  CheckCircleFilled,
  ReloadOutlined,
} from "@ant-design/icons";
import {
  listFolders,
  listFiles,
  type MediaFolder,
  type MediaFile,
} from "../api/media";

const { Sider, Content } = Layout;
const { Text } = Typography;

function buildTreeNodes(folders: MediaFolder[]): DataNode[] {
  return folders.map((f) => ({
    key: f.path,
    title: f.name,
    icon: <FolderOutlined />,
    isLeaf: false,
  }));
}

type Props = {
  open: boolean;
  onClose: () => void;
  /** Called with the selected image URLs when the user confirms. */
  onSelect: (urls: string[]) => void;
  /** Allow selecting more than one image at once. Default: true. */
  multiple?: boolean;
  /** Folder to open by default (e.g. "products"). */
  initialFolder?: string;
};

export function MediaPicker({
  open,
  onClose,
  onSelect,
  multiple = true,
  initialFolder = "",
}: Props) {
  // Tree state
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [loadedKeys, setLoadedKeys] = useState<Set<string>>(new Set());
  const [selectedFolder, setSelectedFolder] = useState<string>(initialFolder);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);

  // Files state
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();

  // Selection: public_id -> secure_url
  const [chosen, setChosen] = useState<Record<string, string>>({});

  // ── Load root folders ───────────────────────────────────────────────────
  const loadRootFolders = useCallback(async () => {
    try {
      const folders = await listFolders();
      setTreeData(buildTreeNodes(folders));
    } catch {
      void message.error("Не вдалося завантажити папки");
    }
  }, []);

  // Reset & reload whenever the modal is opened
  useEffect(() => {
    if (!open) return;
    setChosen({});
    setSelectedFolder(initialFolder);
    setLoadedKeys(new Set());
    setExpandedKeys([]);
    void loadRootFolders();
  }, [open, initialFolder, loadRootFolders]);

  // ── Load files for selected folder ──────────────────────────────────────
  const loadFiles = useCallback(async (folder: string, cursor?: string) => {
    setFilesLoading(true);
    try {
      const res = await listFiles(folder || undefined, cursor);
      setFiles((prev) => (cursor ? [...prev, ...res.files] : res.files));
      setNextCursor(res.next_cursor);
    } catch {
      void message.error("Не вдалося завантажити файли");
    } finally {
      setFilesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setFiles([]);
    setNextCursor(undefined);
    void loadFiles(selectedFolder);
  }, [open, selectedFolder, loadFiles]);

  // ── Tree lazy load sub-folders ──────────────────────────────────────────
  const onLoadData = useCallback(
    async (node: DataNode): Promise<void> => {
      const key = node.key as string;
      if (loadedKeys.has(key)) return;
      const subs = await listFolders(key);
      setLoadedKeys((prev) => new Set([...prev, key]));

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

  // ── Toggle selection of a file ──────────────────────────────────────────
  const toggleFile = (file: MediaFile) => {
    setChosen((prev) => {
      const next = { ...prev };
      if (next[file.public_id]) {
        delete next[file.public_id];
      } else {
        if (!multiple) return { [file.public_id]: file.secure_url };
        next[file.public_id] = file.secure_url;
      }
      return next;
    });
  };

  const chosenCount = Object.keys(chosen).length;

  const handleConfirm = () => {
    const urls = Object.values(chosen);
    if (urls.length) onSelect(urls);
    onClose();
  };

  // ── Breadcrumb ──────────────────────────────────────────────────────────
  const breadcrumbItems = [
    {
      title: (
        <a onClick={() => setSelectedFolder("")} style={{ cursor: "pointer" }}>
          Всі папки
        </a>
      ),
    },
    ...(selectedFolder
      ? selectedFolder.split("/").map((seg, i, arr) => {
          const path = arr.slice(0, i + 1).join("/");
          const isLast = i === arr.length - 1;
          return {
            title: isLast ? (
              seg
            ) : (
              <a onClick={() => setSelectedFolder(path)} style={{ cursor: "pointer" }}>
                {seg}
              </a>
            ),
          };
        })
      : []),
  ];

  return (
    <Modal
      title="Вибрати з медіа-бібліотеки"
      open={open}
      onCancel={onClose}
      width={900}
      okText={chosenCount ? `Вибрати (${chosenCount})` : "Вибрати"}
      cancelText="Скасувати"
      okButtonProps={{ disabled: chosenCount === 0 }}
      onOk={handleConfirm}
      styles={{ body: { padding: 0 } }}
    >
      <Layout style={{ background: "#fff", minHeight: 480 }}>
        {/* Left: Folder tree */}
        <Sider
          width={220}
          style={{ background: "#fafafa", borderRight: "1px solid #f0f0f0" }}
        >
          <div
            style={{
              padding: "12px 12px 4px",
              fontWeight: 600,
              color: "#888",
              fontSize: 11,
              textTransform: "uppercase",
            }}
          >
            Папки
          </div>
          <div style={{ overflowY: "auto", maxHeight: 420, paddingBottom: 8 }}>
            {treeData.length === 0 ? (
              <Empty
                description="Немає папок"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                style={{ margin: "20px 0" }}
              />
            ) : (
              <Tree
                showIcon
                blockNode
                loadData={onLoadData}
                treeData={treeData}
                expandedKeys={expandedKeys}
                onExpand={(keys) => setExpandedKeys(keys as string[])}
                selectedKeys={selectedFolder ? [selectedFolder] : []}
                onSelect={(keys) => setSelectedFolder((keys[0] as string) ?? "")}
              />
            )}
          </div>
        </Sider>

        {/* Right: Files grid */}
        <Content style={{ padding: 12 }}>
          <Space
            style={{ width: "100%", justifyContent: "space-between", marginBottom: 12 }}
          >
            <Breadcrumb items={breadcrumbItems} />
            <Button
              size="small"
              icon={<ReloadOutlined />}
              onClick={() => {
                setLoadedKeys(new Set());
                void loadRootFolders();
                void loadFiles(selectedFolder);
              }}
            />
          </Space>

          {filesLoading && files.length === 0 ? (
            <Spin
              size="large"
              style={{ display: "block", marginTop: 80, textAlign: "center" }}
            />
          ) : files.length === 0 ? (
            <Empty description="В цій папці немає файлів" style={{ marginTop: 80 }} />
          ) : (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                  gap: 10,
                  maxHeight: 400,
                  overflowY: "auto",
                }}
              >
                {files.map((file) => {
                  const isChosen = !!chosen[file.public_id];
                  return (
                    <div
                      key={file.public_id}
                      onClick={() => toggleFile(file)}
                      style={{
                        position: "relative",
                        border: isChosen
                          ? "2px solid #1677ff"
                          : "1px solid #f0f0f0",
                        borderRadius: 8,
                        overflow: "hidden",
                        cursor: "pointer",
                        background: "#f5f5f5",
                      }}
                    >
                      <div
                        style={{
                          height: 110,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Image
                          src={file.secure_url}
                          alt={file.public_id}
                          style={{
                            objectFit: "contain",
                            maxHeight: 110,
                            width: "100%",
                          }}
                          preview={false}
                        />
                      </div>
                      {isChosen && (
                        <CheckCircleFilled
                          style={{
                            position: "absolute",
                            top: 6,
                            right: 6,
                            color: "#1677ff",
                            fontSize: 20,
                            background: "#fff",
                            borderRadius: "50%",
                          }}
                        />
                      )}
                      <Text
                        ellipsis
                        style={{
                          fontSize: 11,
                          display: "block",
                          padding: "4px 6px",
                          background: "#fff",
                        }}
                      >
                        {file.public_id.split("/").pop()}
                      </Text>
                    </div>
                  );
                })}
              </div>

              {nextCursor && (
                <div style={{ textAlign: "center", marginTop: 16 }}>
                  <Button
                    loading={filesLoading}
                    onClick={() => void loadFiles(selectedFolder, nextCursor)}
                  >
                    Завантажити ще
                  </Button>
                </div>
              )}
            </>
          )}
        </Content>
      </Layout>

      {chosenCount > 0 && (
        <div style={{ padding: "8px 16px", borderTop: "1px solid #f0f0f0" }}>
          <Badge count={chosenCount} color="#1677ff" />{" "}
          <Text type="secondary">вибрано зображень</Text>
        </div>
      )}
    </Modal>
  );
}
