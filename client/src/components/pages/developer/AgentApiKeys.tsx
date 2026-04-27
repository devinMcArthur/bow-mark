import React from "react";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Code,
  FormControl,
  FormLabel,
  HStack,
  IconButton,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Radio,
  RadioGroup,
  Spinner,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { FiCopy, FiPlus, FiSlash } from "react-icons/fi";
import {
  AgentApiKeysDocument,
  useAgentApiKeyMintMutation,
  useAgentApiKeyRevokeMutation,
  useAgentApiKeysQuery,
} from "../../../generated/graphql";

const AgentApiKeys: React.FC = () => {
  const { data, loading, error, refetch } = useAgentApiKeysQuery({
    fetchPolicy: "cache-and-network",
  });

  const mintModal = useDisclosure();
  const rawKeyModal = useDisclosure();
  const [mintedRawKey, setMintedRawKey] = React.useState<string | null>(null);
  const [mintedName, setMintedName] = React.useState<string>("");

  const [mintAgentApiKey, mintState] = useAgentApiKeyMintMutation({
    refetchQueries: [{ query: AgentApiKeysDocument }],
    awaitRefetchQueries: true,
  });
  const [revokeAgentApiKey, revokeState] = useAgentApiKeyRevokeMutation({
    refetchQueries: [{ query: AgentApiKeysDocument }],
    awaitRefetchQueries: true,
  });

  const toast = useToast();

  const onMintSubmit = async (formName: string, formScope: "read" | "readwrite") => {
    if (!formName.trim()) {
      toast({ status: "warning", title: "Name is required" });
      return;
    }
    try {
      const result = await mintAgentApiKey({
        variables: { data: { name: formName.trim(), scope: formScope } },
      });
      const raw = result.data?.agentApiKeyMint.rawKey;
      const apiKey = result.data?.agentApiKeyMint.apiKey;
      if (raw && apiKey) {
        setMintedRawKey(raw);
        setMintedName(apiKey.name);
        mintModal.onClose();
        rawKeyModal.onOpen();
      }
    } catch (e) {
      toast({
        status: "error",
        title: "Failed to mint key",
        description: e instanceof Error ? e.message : String(e),
      });
    }
  };

  const onRevokeClick = async (id: string, name: string) => {
    if (!window.confirm(
      `Revoke "${name}"?\n\nNew /mcp/auth exchanges with this key will fail immediately. JWTs already issued continue to work until they expire (~1h).`
    )) {
      return;
    }
    try {
      await revokeAgentApiKey({ variables: { id } });
      toast({ status: "success", title: `Revoked "${name}"` });
    } catch (e) {
      toast({
        status: "error",
        title: "Failed to revoke",
        description: e instanceof Error ? e.message : String(e),
      });
    }
  };

  const onCopyKey = async () => {
    if (!mintedRawKey) return;
    try {
      await navigator.clipboard.writeText(mintedRawKey);
      toast({ status: "success", title: "Key copied to clipboard" });
    } catch {
      toast({ status: "error", title: "Clipboard write failed — copy manually" });
    }
  };

  const onRawKeyClose = () => {
    setMintedRawKey(null);
    setMintedName("");
    rawKeyModal.onClose();
    void refetch();
  };

  if (loading && !data) return <Spinner />;
  if (error) {
    return (
      <Alert status="error">
        <AlertIcon />
        Failed to load agent API keys: {error.message}
      </Alert>
    );
  }

  const keys = data?.agentApiKeys ?? [];

  return (
    <Box>
      <HStack justify="space-between" mb={4}>
        <Box>
          <Text fontWeight={600}>Agent API Keys</Text>
          <Text fontSize="sm" color="gray.600">
            Credentials for external agents that talk to the MCP server. Keys
            grant scoped access (read or read+write) and never expire — revoke
            to invalidate.
          </Text>
        </Box>
        <Button leftIcon={<FiPlus />} colorScheme="blue" onClick={mintModal.onOpen}>
          Mint key
        </Button>
      </HStack>

      {keys.length === 0 ? (
        <Box
          p={8}
          textAlign="center"
          borderWidth="1px"
          borderStyle="dashed"
          borderRadius="md"
          color="gray.500"
        >
          No agent API keys yet. Mint one to start.
        </Box>
      ) : (
        <Table size="sm" variant="simple">
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>Prefix</Th>
              <Th>Scope</Th>
              <Th>Last used</Th>
              <Th>Status</Th>
              <Th />
            </Tr>
          </Thead>
          <Tbody>
            {keys.map((k) => {
              const revoked = !!k.revokedAt;
              return (
                <Tr key={k._id} opacity={revoked ? 0.55 : 1}>
                  <Td fontWeight={500}>{k.name}</Td>
                  <Td>
                    <Code fontSize="xs">agtkey_{k.keyPrefix}_…</Code>
                  </Td>
                  <Td>
                    <Badge colorScheme={k.scope === "readwrite" ? "purple" : "green"}>
                      {k.scope}
                    </Badge>
                  </Td>
                  <Td>
                    {k.lastUsedAt
                      ? new Date(k.lastUsedAt).toLocaleString()
                      : <Text as="span" color="gray.400">never</Text>}
                  </Td>
                  <Td>
                    {revoked ? (
                      <Badge colorScheme="red">revoked</Badge>
                    ) : (
                      <Badge colorScheme="gray">active</Badge>
                    )}
                  </Td>
                  <Td textAlign="right">
                    {!revoked && (
                      <IconButton
                        aria-label="Revoke key"
                        icon={<FiSlash />}
                        size="sm"
                        variant="ghost"
                        colorScheme="red"
                        isLoading={revokeState.loading}
                        onClick={() => onRevokeClick(k._id, k.name)}
                      />
                    )}
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      )}

      <MintModal
        isOpen={mintModal.isOpen}
        onClose={mintModal.onClose}
        onSubmit={onMintSubmit}
        loading={mintState.loading}
      />

      <RawKeyModal
        isOpen={rawKeyModal.isOpen}
        onClose={onRawKeyClose}
        rawKey={mintedRawKey}
        name={mintedName}
        onCopy={onCopyKey}
      />
    </Box>
  );
};

interface MintModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, scope: "read" | "readwrite") => Promise<void>;
  loading: boolean;
}

const MintModal: React.FC<MintModalProps> = ({ isOpen, onClose, onSubmit, loading }) => {
  const [name, setName] = React.useState("");
  const [scope, setScope] = React.useState<"read" | "readwrite">("read");

  // Reset form whenever the modal closes so the next open is fresh.
  React.useEffect(() => {
    if (!isOpen) {
      setName("");
      setScope("read");
    }
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} closeOnOverlayClick={!loading}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Mint a new agent API key</ModalHeader>
        <ModalCloseButton isDisabled={loading} />
        <ModalBody>
          <Stack spacing={4}>
            <FormControl isRequired>
              <FormLabel>Name</FormLabel>
              <Input
                value={name}
                placeholder="Telemetry Agent (read)"
                onChange={(e) => setName(e.target.value)}
              />
            </FormControl>
            <FormControl>
              <FormLabel>Scope</FormLabel>
              <RadioGroup value={scope} onChange={(v) => setScope(v as "read" | "readwrite")}>
                <Stack>
                  <Radio value="read">
                    <Text fontWeight={500}>read</Text>
                    <Text fontSize="sm" color="gray.600">
                      Read-only access to MCP tools (search, financial,
                      productivity, operational, telemetry, tender reads).
                    </Text>
                  </Radio>
                  <Radio value="readwrite">
                    <Text fontWeight={500}>readwrite</Text>
                    <Text fontSize="sm" color="gray.600">
                      Full access including tender mutations (create/update/delete
                      pricing rows, save tender notes).
                    </Text>
                  </Radio>
                </Stack>
              </RadioGroup>
            </FormControl>
          </Stack>
        </ModalBody>
        <ModalFooter>
          <Button mr={3} onClick={onClose} isDisabled={loading}>
            Cancel
          </Button>
          <Button
            colorScheme="blue"
            isLoading={loading}
            onClick={() => void onSubmit(name, scope)}
          >
            Mint
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

interface RawKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  rawKey: string | null;
  name: string;
  onCopy: () => void;
}

const RawKeyModal: React.FC<RawKeyModalProps> = ({ isOpen, onClose, rawKey, name, onCopy }) => {
  const [confirmed, setConfirmed] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen) setConfirmed(false);
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} closeOnOverlayClick={false} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Key minted: {name}</ModalHeader>
        <ModalBody>
          <Stack spacing={4}>
            <Alert status="warning">
              <AlertIcon />
              Copy this key now. It is shown only once and cannot be recovered —
              only its bcrypt hash is stored. If lost, mint a new key and revoke
              this one.
            </Alert>

            <Box
              borderWidth="1px"
              borderRadius="md"
              p={3}
              bg="gray.50"
              fontFamily="mono"
              fontSize="sm"
              wordBreak="break-all"
            >
              {rawKey}
            </Box>

            <Button leftIcon={<FiCopy />} onClick={onCopy} alignSelf="flex-start">
              Copy to clipboard
            </Button>
          </Stack>
        </ModalBody>
        <ModalFooter>
          <HStack>
            <Radio
              isChecked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            >
              I&apos;ve saved this key somewhere safe
            </Radio>
            <Button colorScheme="blue" onClick={onClose} isDisabled={!confirmed}>
              Close
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default AgentApiKeys;
