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
  Table,
  Tbody,
  Td,
  Text,
  Textarea,
  Th,
  Thead,
  Tr,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { gql } from "@apollo/client";
import { useRouter } from "next/router";
import React from "react";
import Breadcrumbs from "../components/Common/Breadcrumbs";
import Container from "../components/Common/Container";
import Loading from "../components/Common/Loading";
import Permission from "../components/Common/Permission";
import { UserRoles } from "../generated/graphql";
import * as Apollo from "@apollo/client";

// ─── GQL ─────────────────────────────────────────────────────────────────────

const TENDERS_QUERY = gql`
  query Tenders {
    tenders {
      _id
      name
      jobcode
      status
      files {
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
  files: { _id: string }[];
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

// ─── Status badge ─────────────────────────────────────────────────────────────

function statusColor(status: string): string {
  if (status === "won") return "green";
  if (status === "lost") return "red";
  return "blue"; // bidding
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const Tenders = () => {
  const router = useRouter();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const [name, setName] = React.useState("");
  const [jobcode, setJobcode] = React.useState("");
  const [description, setDescription] = React.useState("");

  const { data, loading, refetch } = Apollo.useQuery<TendersQueryResult>(
    TENDERS_QUERY
  );

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

    const tenders = data?.tenders ?? [];

    return (
      <Box>
        <Flex
          w="100%"
          flexDir="row"
          justifyContent="space-between"
          alignItems="center"
          mb={4}
        >
          <Breadcrumbs
            crumbs={[{ title: "Tenders", isCurrentPage: true }]}
          />
          <Button colorScheme="blue" size="sm" onClick={onOpen}>
            New Tender
          </Button>
        </Flex>

        {tenders.length === 0 && !loading ? (
          <Text color="gray.500">No tenders yet.</Text>
        ) : (
          <Table variant="simple" size="sm">
            <Thead>
              <Tr>
                <Th>Job Code</Th>
                <Th>Name</Th>
                <Th>Status</Th>
                <Th isNumeric>Files</Th>
                <Th>Created</Th>
              </Tr>
            </Thead>
            <Tbody>
              {tenders.map((tender) => (
                <Tr
                  key={tender._id}
                  cursor="pointer"
                  _hover={{ bg: "gray.50" }}
                  onClick={() => router.push(`/tender/${tender._id}`)}
                >
                  <Td fontFamily="mono" fontWeight="600">
                    {tender.jobcode}
                  </Td>
                  <Td>{tender.name}</Td>
                  <Td>
                    <Badge colorScheme={statusColor(tender.status)}>
                      {tender.status}
                    </Badge>
                  </Td>
                  <Td isNumeric>{tender.files.length}</Td>
                  <Td>
                    {new Date(tender.createdAt).toLocaleDateString("en-CA")}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
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
