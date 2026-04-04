import {
  Badge,
  Box,
  Button,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Link as ChakraLink,
  Select,
  Text,
  Textarea,
  useToast,
  VStack,
} from "@chakra-ui/react";
import { gql } from "@apollo/client";
import * as Apollo from "@apollo/client";
import NextLink from "next/link";
import React from "react";
import { TenderDetail, tenderStatusColor } from "./types";

// ─── GQL ─────────────────────────────────────────────────────────────────────

const TENDER_UPDATE = gql`
  mutation TenderUpdate($id: ID!, $data: TenderUpdateData!) {
    tenderUpdate(id: $id, data: $data) {
      _id
      name
      jobcode
      status
      description
    }
  }
`;

interface TenderUpdateVars {
  id: string;
  data: {
    status?: string;
    description?: string;
  };
}

interface TenderUpdateResult {
  tenderUpdate: {
    _id: string;
    name: string;
    jobcode: string;
    status: string;
    description?: string | null;
  };
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface TenderOverviewProps {
  tender: TenderDetail;
  onUpdated?: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

const TenderOverview = ({ tender, onUpdated }: TenderOverviewProps) => {
  const toast = useToast();

  const [editing, setEditing] = React.useState(false);
  const [status, setStatus] = React.useState(tender.status);
  const [description, setDescription] = React.useState(
    tender.description ?? ""
  );

  React.useEffect(() => {
    if (!editing) {
      setStatus(tender.status);
      setDescription(tender.description ?? "");
    }
  }, [tender.status, tender.description, editing]);

  const [tenderUpdate, { loading }] = Apollo.useMutation<
    TenderUpdateResult,
    TenderUpdateVars
  >(TENDER_UPDATE);

  const handleSave = React.useCallback(async () => {
    try {
      await tenderUpdate({
        variables: {
          id: tender._id,
          data: {
            status,
            description: description.trim() || undefined,
          },
        },
      });
      setEditing(false);
      if (onUpdated) onUpdated();
    } catch (e: any) {
      toast({
        title: "Error saving tender",
        description: e.message,
        status: "error",
        isClosable: true,
      });
    }
  }, [tender._id, status, description, tenderUpdate, toast, onUpdated]);

  const handleCancel = () => {
    setStatus(tender.status);
    setDescription(tender.description ?? "");
    setEditing(false);
  };

  return (
    <Box>
      <Heading size="md" mb={2}>
        {tender.name}
      </Heading>

      <HStack mb={3} spacing={3} align="center" justify="space-between">
        <HStack spacing={3}>
          <Text fontFamily="mono" fontWeight="600" color="gray.600">
            {tender.jobcode}
          </Text>
          <Badge colorScheme={tenderStatusColor(tender.status)}>{tender.status}</Badge>
        </HStack>
        {!editing && (
          <Button size="xs" variant="outline" onClick={() => setEditing(true)}>
            Edit
          </Button>
        )}
      </HStack>

      {tender.jobsite && (
        <HStack mb={3} spacing={2} align="center">
          <Text fontSize="sm" color="gray.500">
            Jobsite:
          </Text>
          <NextLink href={`/jobsite/${tender.jobsite._id}`} passHref>
            <ChakraLink fontSize="sm" color="blue.600">
              {tender.jobsite.name}
            </ChakraLink>
          </NextLink>
        </HStack>
      )}

      {!editing ? (
        <>
          {tender.description && (
            <Text color="gray.700" mb={3} whiteSpace="pre-wrap">
              {tender.description}
            </Text>
          )}
        </>
      ) : (
        <VStack align="stretch" spacing={3}>
          <FormControl>
            <FormLabel fontSize="sm">Status</FormLabel>
            <Select
              size="sm"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="bidding">Bidding</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
            </Select>
          </FormControl>

          <FormControl>
            <FormLabel fontSize="sm">Description</FormLabel>
            <Textarea
              size="sm"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
            />
          </FormControl>

          <HStack spacing={2}>
            <Button
              size="sm"
              colorScheme="blue"
              isLoading={loading}
              onClick={handleSave}
            >
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancel}>
              Cancel
            </Button>
          </HStack>
        </VStack>
      )}
    </Box>
  );
};

export default TenderOverview;
