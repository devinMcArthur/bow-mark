import {
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  Textarea,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { gql } from "@apollo/client";
import { useRouter } from "next/router";
import NextLink from "next/link";
import React from "react";
import { FiChevronRight, FiFileText } from "react-icons/fi";
import Breadcrumbs from "../components/Common/Breadcrumbs";
import Container from "../components/Common/Container";
import Loading from "../components/Common/Loading";
import Permission from "../components/Common/Permission";
import { UserRoles } from "../generated/graphql";
import { tenderStatusColor } from "../components/Tender/types";
import * as Apollo from "@apollo/client";

// ─── GQL ─────────────────────────────────────────────────────────────────────

const TENDERS_QUERY = gql`
  query Tenders {
    tenders {
      _id
      name
      jobcode
      status
      documents {
        _id
      }
      createdAt
    }
  }
`;

const TENDER_CREATE_MUTATION = gql`
  mutation TenderCreate($data: TenderCreateData!) {
    tenderCreate(data: $data) {
      _id
    }
  }
`;

// ─── Types ────────────────────────────────────────────────────────────────────

interface TenderListItem {
  _id: string;
  name: string;
  jobcode: string;
  status: string;
  documents: { _id: string }[];
  createdAt: string;
}

interface TendersQueryResult {
  tenders: TenderListItem[];
}

interface TenderCreateResult {
  tenderCreate: { _id: string };
}

interface TenderCreateVars {
  data: {
    name: string;
    jobcode: string;
    description?: string;
  };
}

// ─── Status order for sorting ─────────────────────────────────────────────────

const STATUS_ORDER: Record<string, number> = { bidding: 0, won: 1, lost: 2 };

// ─── Page ─────────────────────────────────────────────────────────────────────

const Tenders = () => {
  const router = useRouter();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const [name, setName] = React.useState("");
  const [jobcode, setJobcode] = React.useState("");
  const [description, setDescription] = React.useState("");

  const { data, loading } = Apollo.useQuery<TendersQueryResult>(TENDERS_QUERY);

  const [tenderCreate, { loading: creating }] = Apollo.useMutation<
    TenderCreateResult,
    TenderCreateVars
  >(TENDER_CREATE_MUTATION);

  const handleCreate = React.useCallback(async () => {
    if (!name.trim() || !jobcode.trim()) {
      toast({
        title: "Name and Job Code are required",
        status: "warning",
        isClosable: true,
      });
      return;
    }

    try {
      const res = await tenderCreate({
        variables: {
          data: {
            name: name.trim(),
            jobcode: jobcode.trim(),
            description: description.trim() || undefined,
          },
        },
      });

      if (res.data?.tenderCreate._id) {
        onClose();
        setName("");
        setJobcode("");
        setDescription("");
        router.push(`/tender/${res.data.tenderCreate._id}`);
      }
    } catch (e: any) {
      toast({
        title: "Error creating tender",
        description: e.message,
        status: "error",
        isClosable: true,
      });
    }
  }, [name, jobcode, description, tenderCreate, toast, onClose, router]);

  const handleModalClose = () => {
    setName("");
    setJobcode("");
    setDescription("");
    onClose();
  };

  // ── Rendering ───────────────────────────────────────────────────────────────

  const content = React.useMemo(() => {
    if (!data?.tenders && loading) return <Loading />;

    const tenders = [...(data?.tenders ?? [])].sort((a, b) => {
      const so = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
      if (so !== 0) return so;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const bidding = tenders.filter((t) => t.status === "bidding").length;
    const won = tenders.filter((t) => t.status === "won").length;
    const lost = tenders.filter((t) => t.status === "lost").length;

    return (
      <Box>
        {/* Header */}
        <Flex align="flex-start" justify="space-between" mb={6} wrap="wrap" gap={3}>
          <Box>
            <Breadcrumbs crumbs={[{ title: "Tenders", isCurrentPage: true }]} />
            {tenders.length > 0 && (
              <Flex mt={1} gap={3}>
                {bidding > 0 && (
                  <Text fontSize="sm" color="blue.600" fontWeight="500">
                    {bidding} bidding
                  </Text>
                )}
                {won > 0 && (
                  <Text fontSize="sm" color="green.600" fontWeight="500">
                    {won} won
                  </Text>
                )}
                {lost > 0 && (
                  <Text fontSize="sm" color="red.500">
                    {lost} lost
                  </Text>
                )}
              </Flex>
            )}
          </Box>
          <Flex gap={2} align="center" flexShrink={0}>
            <NextLink href="/pricing" passHref>
              <Button as="a" size="sm" variant="outline" colorScheme="teal">
                Rate Builder
              </Button>
            </NextLink>
            <Button colorScheme="blue" size="sm" onClick={onOpen}>
              New Tender
            </Button>
          </Flex>
        </Flex>

        {/* List */}
        {tenders.length === 0 && !loading ? (
          <Flex
            direction="column"
            align="center"
            justify="center"
            py={16}
            color="gray.400"
          >
            <Text fontSize="sm">No tenders yet.</Text>
          </Flex>
        ) : (
          <Box>
            {tenders.map((tender) => (
              <Flex
                key={tender._id}
                align="center"
                px={4}
                py={3}
                mb={2}
                bg="white"
                border="1px solid"
                borderColor="gray.200"
                borderRadius="lg"
                cursor="pointer"
                _hover={{ borderColor: "blue.200", shadow: "sm" }}
                onClick={() => router.push(`/tender/${tender._id}`)}
                transition="border-color 0.15s, box-shadow 0.15s"
              >
                {/* Status accent bar */}
                <Box
                  w="3px"
                  alignSelf="stretch"
                  borderRadius="full"
                  bg={`${tenderStatusColor(tender.status)}.400`}
                  mr={3}
                  flexShrink={0}
                />

                {/* Main info */}
                <Box flex={1} minW={0}>
                  <Flex align="center" gap={2} mb="2px" wrap="wrap">
                    <Text
                      fontWeight="600"
                      fontSize="sm"
                      color="gray.800"
                      isTruncated
                    >
                      {tender.name}
                    </Text>
                    <Badge
                      colorScheme={tenderStatusColor(tender.status)}
                      flexShrink={0}
                      fontSize="10px"
                    >
                      {tender.status}
                    </Badge>
                  </Flex>
                  <Flex align="center" gap={3}>
                    <Text fontSize="xs" fontFamily="mono" color="gray.500">
                      {tender.jobcode}
                    </Text>
                    <Text fontSize="xs" color="gray.400">
                      {new Date(tender.createdAt).toLocaleDateString("en-CA")}
                    </Text>
                    {tender.documents.length > 0 && (
                      <Flex align="center" gap={1}>
                        <FiFileText size={11} color="var(--chakra-colors-gray-400)" />
                        <Text fontSize="xs" color="gray.400">
                          {tender.documents.length}
                        </Text>
                      </Flex>
                    )}
                  </Flex>
                </Box>

                {/* Chevron */}
                <Box color="gray.300" ml={2} flexShrink={0}>
                  <FiChevronRight size={16} />
                </Box>
              </Flex>
            ))}
          </Box>
        )}
      </Box>
    );
  }, [data?.tenders, loading, onOpen, router]);

  return (
    <Permission minRole={UserRoles.ProjectManager} type={null} showError>
      <Container>
        {content}

        <Modal isOpen={isOpen} onClose={handleModalClose}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>New Tender</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <FormControl mb={3} isRequired>
                <FormLabel>Name</FormLabel>
                <Input
                  placeholder="Tender name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </FormControl>
              <FormControl mb={3} isRequired>
                <FormLabel>Job Code</FormLabel>
                <Input
                  placeholder="e.g. T-2024-001"
                  value={jobcode}
                  onChange={(e) => setJobcode(e.target.value)}
                />
              </FormControl>
              <FormControl mb={3}>
                <FormLabel>Description (optional)</FormLabel>
                <Textarea
                  placeholder="Brief description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </FormControl>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={handleModalClose}>
                Cancel
              </Button>
              <Button
                colorScheme="blue"
                isLoading={creating}
                onClick={handleCreate}
              >
                Create
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Container>
    </Permission>
  );
};

export default Tenders;
