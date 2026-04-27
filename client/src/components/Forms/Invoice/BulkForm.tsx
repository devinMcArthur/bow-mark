import React from "react";
import {
  Box,
  Button,
  Checkbox,
  Flex,
  HStack,
  IconButton,
  Input,
  InputGroup,
  InputLeftAddon,
  NumberInput,
  NumberInputField,
  Text,
  Textarea,
  useToast,
} from "@chakra-ui/react";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import { InvoiceData } from "../../../generated/graphql";
import {
  formatThousands,
  parseThousands,
  THOUSANDS_PATTERN,
} from "../../../utils/numberFormat";
import CompanySearch from "../../Search/CompanySearch";
import InvoiceFileAttachment, {
  InvoiceFileAttachmentHandle,
} from "./FileAttachment";

/**
 * Bulk invoice create form. Shared batch header (company, date, flags)
 * plus a repeating "line item" block for cost / invoice# / description /
 * file. Submits each row as its own invoice — see the comment on the
 * parent's submitHandler for the retry/toast semantics.
 *
 * Edit still uses the single-row `InvoiceForm` — this form is create-only.
 */

export interface InvoiceBulkRow {
  cost: number;
  invoiceNumber: string;
  description: string;
  documentId: string | null;
}

export interface InvoiceBulkHeader {
  companyId: string;
  date: Date;
  internal: boolean;
  accrual: boolean;
}

interface IInvoiceBulkForm {
  submitHandler: (rows: InvoiceData[]) => Promise<void>;
  isLoading?: boolean;
  jobsiteId?: string;
  invoiceKind?: "subcontractor" | "revenue" | "material";
  /**
   * Pre-selects the company in the batch header. Used on surfaces where
   * the invoice batch's company is usually known — e.g. the Jobsite
   * Material add flow, where the material's supplier is the overwhelming
   * default.
   */
  defaultCompanyId?: string;
}

interface LineState {
  id: string;
  cost: string;
  invoiceNumber: string;
  description: string;
  fileRef: React.RefObject<InvoiceFileAttachmentHandle>;
}

const makeLine = (): LineState => ({
  id: `line-${Math.random().toString(36).slice(2)}-${Date.now()}`,
  cost: "",
  invoiceNumber: "",
  description: "",
  fileRef: React.createRef<InvoiceFileAttachmentHandle>(),
});

const toISODateInput = (d: Date): string => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};


/** Shared compact label style used across the jobsite-page forms. */
const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text
    as="label"
    display="block"
    fontSize="xs"
    fontWeight="semibold"
    color="gray.500"
    textTransform="uppercase"
    letterSpacing="wide"
    mb={1}
  >
    {children}
  </Text>
);

const InvoiceBulkForm = ({
  submitHandler,
  isLoading,
  jobsiteId,
  invoiceKind,
  defaultCompanyId,
}: IInvoiceBulkForm) => {
  const toast = useToast();
  const [submitting, setSubmitting] = React.useState(false);

  const [header, setHeader] = React.useState<InvoiceBulkHeader>({
    companyId: defaultCompanyId ?? "",
    date: new Date(),
    internal: false,
    accrual: false,
  });
  const [lines, setLines] = React.useState<LineState[]>(() => [makeLine()]);

  const busy = !!isLoading || submitting;

  const updateLine = (id: string, patch: Partial<LineState>) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };
  const addLine = () => setLines((prev) => [...prev, makeLine()]);
  const removeLine = (id: string) =>
    setLines((prev) =>
      prev.length === 1 ? prev : prev.filter((l) => l.id !== id)
    );

  const validate = (): string | null => {
    if (!header.companyId) return "Please select a company";
    if (!header.date) return "Please select a date";
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const costNum = Number(line.cost);
      if (!line.cost || Number.isNaN(costNum))
        return `Line ${i + 1}: cost is required`;
      if (!line.invoiceNumber.trim())
        return `Line ${i + 1}: invoice number is required`;
    }
    return null;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      toast({
        status: "error",
        title: "Invalid form",
        description: err,
        isClosable: true,
      });
      return;
    }
    setSubmitting(true);
    try {
      const prepared: InvoiceData[] = [];
      for (const line of lines) {
        let documentId: string | null = null;
        if (line.fileRef.current) {
          try {
            const res = await line.fileRef.current.prepare();
            documentId = res ?? null;
          } catch (uploadErr) {
            toast({
              status: "error",
              title: "File upload failed",
              description:
                uploadErr instanceof Error
                  ? `Line for invoice #${line.invoiceNumber}: ${uploadErr.message}`
                  : "Unknown error",
              isClosable: true,
            });
            return;
          }
        }
        prepared.push({
          companyId: header.companyId,
          invoiceNumber: line.invoiceNumber.trim(),
          cost: Number(line.cost),
          date: header.date,
          description: line.description.trim() || null,
          internal: header.internal,
          accrual: header.accrual,
          documentId,
        });
      }
      await submitHandler(prepared);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit}>
      {/* Batch header — settings that apply to every row. */}
      <Box
        borderWidth="1px"
        borderColor="gray.200"
        borderRadius="md"
        p={3}
        mb={4}
      >
        <Text
          fontSize="xs"
          fontWeight="semibold"
          color="gray.500"
          textTransform="uppercase"
          letterSpacing="wide"
          mb={2}
        >
          Batch details
        </Text>
        <Flex direction="column" gap={3}>
          <Box>
            <FieldLabel>Company</FieldLabel>
            <CompanySearch
              value={header.companyId}
              isDisabled={busy}
              companySelected={(c) =>
                setHeader((h) => ({ ...h, companyId: c._id }))
              }
            />
          </Box>
          <Flex gap={3} align="flex-end" wrap="wrap">
            <Box flex="1 1 160px">
              <FieldLabel>Date</FieldLabel>
              <Input
                type="date"
                size="sm"
                isDisabled={busy}
                value={toISODateInput(header.date)}
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v) return;
                  const [y, m, d] = v.split("-").map(Number);
                  setHeader((h) => ({ ...h, date: new Date(y, m - 1, d) }));
                }}
              />
            </Box>
            <HStack spacing={5} pb={1}>
              <Checkbox
                isChecked={header.internal}
                isDisabled={busy}
                onChange={(e) =>
                  setHeader((h) => ({ ...h, internal: e.target.checked }))
                }
              >
                Internal
              </Checkbox>
              <Checkbox
                isChecked={header.accrual}
                isDisabled={busy}
                onChange={(e) =>
                  setHeader((h) => ({ ...h, accrual: e.target.checked }))
                }
              >
                Accrual
              </Checkbox>
            </HStack>
          </Flex>
        </Flex>
      </Box>

      {/* Line items */}
      <Flex align="center" justify="space-between" mb={2}>
        <Text
          fontSize="xs"
          fontWeight="semibold"
          color="gray.500"
          textTransform="uppercase"
          letterSpacing="wide"
        >
          Invoices ({lines.length})
        </Text>
      </Flex>

      <Flex direction="column" gap={3}>
        {lines.map((line, idx) => (
          <Box
            key={line.id}
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="md"
            p={3}
          >
            <Flex justify="space-between" align="center" mb={2}>
              <Text fontSize="xs" fontWeight="semibold" color="gray.500">
                #{idx + 1}
              </Text>
              {lines.length > 1 && (
                <IconButton
                  aria-label="Remove line"
                  icon={<FiTrash2 />}
                  size="xs"
                  variant="ghost"
                  color="gray.500"
                  isDisabled={busy}
                  onClick={() => removeLine(line.id)}
                />
              )}
            </Flex>

            <HStack spacing={2} align="flex-start" mb={2}>
              <Box flex="0 0 160px">
                <FieldLabel>Cost</FieldLabel>
                <InputGroup size="sm">
                  <InputLeftAddon>$</InputLeftAddon>
                  <NumberInput
                    size="sm"
                    value={line.cost}
                    isDisabled={busy}
                    format={formatThousands}
                    parse={parseThousands}
                    pattern={THOUSANDS_PATTERN}
                    onChange={(valueAsString) =>
                      updateLine(line.id, { cost: valueAsString })
                    }
                    w="100%"
                  >
                    <NumberInputField borderLeftRadius={0} />
                  </NumberInput>
                </InputGroup>
              </Box>
              <Box flex={1}>
                <FieldLabel>Invoice #</FieldLabel>
                <Input
                  size="sm"
                  value={line.invoiceNumber}
                  isDisabled={busy}
                  onChange={(e) =>
                    updateLine(line.id, { invoiceNumber: e.target.value })
                  }
                />
              </Box>
            </HStack>

            <Box mb={2}>
              <FieldLabel>Description</FieldLabel>
              <Textarea
                size="sm"
                rows={2}
                value={line.description}
                isDisabled={busy}
                onChange={(e) =>
                  updateLine(line.id, { description: e.target.value })
                }
              />
            </Box>

            {jobsiteId && invoiceKind && (
              <InvoiceFileAttachment
                ref={line.fileRef}
                jobsiteId={jobsiteId}
                kind={invoiceKind}
                initialDocumentId={null}
                isLoading={busy}
              />
            )}
          </Box>
        ))}
      </Flex>

      <Flex justify="flex-start" mt={3}>
        <Button
          size="sm"
          leftIcon={<FiPlus />}
          variant="outline"
          isDisabled={busy}
          onClick={addLine}
        >
          Add another invoice
        </Button>
      </Flex>

      <Flex justify="flex-end" mt={5}>
        <Button
          type="submit"
          colorScheme="blue"
          size="sm"
          isLoading={busy}
        >
          {lines.length === 1
            ? "Submit invoice"
            : `Submit ${lines.length} invoices`}
        </Button>
      </Flex>
    </form>
  );
};

export default InvoiceBulkForm;
