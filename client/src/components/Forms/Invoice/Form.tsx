import {
  Box,
  Button,
  Checkbox,
  Flex,
  HStack,
  Input,
  InputGroup,
  InputLeftAddon,
  NumberInput,
  NumberInputField,
  SimpleGrid,
  Text,
  Textarea,
  useToast,
} from "@chakra-ui/react";
import React from "react";
import { Controller, SubmitHandler, UseFormProps } from "react-hook-form";
import { useInvoiceForm } from "../../../forms/invoice";
import { InvoiceData } from "../../../generated/graphql";
import CompanySearch from "../../Search/CompanySearch";
import InvoiceFileAttachment, {
  InvoiceFileAttachmentHandle,
} from "./FileAttachment";

interface IInvoiceForm {
  submitHandler: SubmitHandler<InvoiceData>;
  formOptions?: UseFormProps;
  isLoading?: boolean;

  /**
   * When set, the form renders a file-attachment control. The file is
   * uploaded under `/jobsites/<id>/Invoices/<kind-folder>/` before
   * submission and the resulting `documentId` is merged into the
   * invoice data passed to `submitHandler`. Omit these props on
   * surfaces where attachments don't apply — the form degrades to
   * just the structured fields.
   */
  jobsiteId?: string;
  invoiceKind?: "subcontractor" | "revenue" | "material";
  /** Existing Document id on the invoice being edited (update form). */
  initialDocumentId?: string | null;
}

/**
 * Format a number with thousand separators for display.
 * "12345.67" → "12,345.67". Paired with `parseThousands`.
 */
const formatThousands = (val: string | number | undefined): string => {
  if (val === undefined || val === null || val === "") return "";
  const stripped = typeof val === "string" ? val.replace(/,/g, "") : String(val);
  if (stripped === "" || stripped === "-") return stripped;
  const [whole, fraction] = stripped.split(".");
  const n = parseInt(whole, 10);
  if (Number.isNaN(n)) return stripped;
  const formattedWhole = n.toLocaleString("en-US");
  return fraction !== undefined ? `${formattedWhole}.${fraction}` : formattedWhole;
};
const parseThousands = (val: string): string => val.replace(/,/g, "");

const toInputDate = (d: Date | string | undefined): string => {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

/**
 * Label component matching the compact uppercase style used across
 * the jobsite-page forms for a consistent look.
 */
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

const FieldError: React.FC<{ message?: string }> = ({ message }) =>
  message ? (
    <Text fontSize="xs" color="red.500" mt={1}>
      {message}
    </Text>
  ) : null;

const InvoiceForm = ({
  formOptions,
  submitHandler,
  isLoading,
  jobsiteId,
  invoiceKind,
  initialDocumentId,
}: IInvoiceForm) => {
  const { handleSubmit, control, setValue } = useInvoiceForm(formOptions);
  const fileRef = React.useRef<InvoiceFileAttachmentHandle>(null);
  const toast = useToast();
  const [submitting, setSubmitting] = React.useState(false);

  const canAttach = !!jobsiteId && !!invoiceKind;

  // Wraps the caller's submit handler with the file-upload step so the
  // parent sees a single "with documentId" invoice payload and doesn't
  // have to orchestrate the ensureFolder → upload → attach sequence.
  // Errors thrown from prepare() (e.g. duplicate filename) are surfaced
  // as a toast — without this they'd be swallowed by RHF's handleSubmit.
  const wrappedSubmit: SubmitHandler<InvoiceData> = React.useCallback(
    async (data) => {
      setSubmitting(true);
      try {
        let documentId: string | null | undefined = data.documentId;
        if (canAttach && fileRef.current) {
          try {
            documentId = await fileRef.current.prepare();
          } catch (e) {
            toast({
              status: "error",
              title: "File upload failed",
              description: e instanceof Error ? e.message : "Unknown error",
              isClosable: true,
            });
            return;
          }
        }
        const payload: InvoiceData = {
          companyId: data.companyId,
          invoiceNumber: data.invoiceNumber,
          cost: Number(data.cost),
          date: data.date,
          description: data.description,
          internal: data.internal,
          accrual: data.accrual,
          documentId: documentId ?? null,
        };
        await submitHandler(payload);
      } finally {
        setSubmitting(false);
      }
    },
    [canAttach, submitHandler, toast]
  );

  const busy = isLoading || submitting;

  return (
    <form onSubmit={handleSubmit(wrappedSubmit)}>
      <Flex direction="column" gap={3}>
        <Controller
          control={control}
          name="companyId"
          render={({ field, fieldState }) => (
            <Box>
              <FieldLabel>Company</FieldLabel>
              <CompanySearch
                {...field}
                isDisabled={busy}
                companySelected={(company) =>
                  setValue("companyId", company._id)
                }
              />
              <FieldError message={fieldState.error?.message} />
            </Box>
          )}
        />

        <SimpleGrid spacing={3} columns={[1, 1, 3]}>
          <Controller
            control={control}
            name="cost"
            render={({ field, fieldState }) => (
              <Box>
                <FieldLabel>Cost</FieldLabel>
                <InputGroup size="sm">
                  <InputLeftAddon>$</InputLeftAddon>
                  <NumberInput
                    size="sm"
                    value={field.value?.toString() ?? ""}
                    isDisabled={busy}
                    isInvalid={!!fieldState.error}
                    format={formatThousands}
                    parse={parseThousands}
                    onChange={(valueAsString) =>
                      field.onChange(valueAsString)
                    }
                    w="100%"
                  >
                    <NumberInputField borderLeftRadius={0} />
                  </NumberInput>
                </InputGroup>
                <FieldError message={fieldState.error?.message} />
              </Box>
            )}
          />

          <Controller
            control={control}
            name="invoiceNumber"
            render={({ field, fieldState }) => (
              <Box>
                <FieldLabel>Invoice #</FieldLabel>
                <Input
                  size="sm"
                  {...field}
                  value={field.value ?? ""}
                  isDisabled={busy}
                  isInvalid={!!fieldState.error}
                />
                <FieldError message={fieldState.error?.message} />
              </Box>
            )}
          />

          <Controller
            control={control}
            name="date"
            render={({ field, fieldState }) => (
              <Box>
                <FieldLabel>Date</FieldLabel>
                <Input
                  size="sm"
                  type="date"
                  value={toInputDate(field.value)}
                  onChange={(e) => field.onChange(e.target.value)}
                  isDisabled={busy}
                  isInvalid={!!fieldState.error}
                />
                <FieldError message={fieldState.error?.message} />
              </Box>
            )}
          />
        </SimpleGrid>

        <Controller
          control={control}
          name="description"
          render={({ field, fieldState }) => (
            <Box>
              <FieldLabel>Description</FieldLabel>
              <Textarea
                size="sm"
                rows={3}
                {...field}
                value={field.value ?? ""}
                isDisabled={busy}
                isInvalid={!!fieldState.error}
              />
              <FieldError message={fieldState.error?.message} />
            </Box>
          )}
        />

        <HStack spacing={5}>
          <Controller
            control={control}
            name="internal"
            render={({ field }) => (
              <Checkbox
                isChecked={!!field.value}
                onChange={(e) => field.onChange(e.target.checked)}
                isDisabled={busy}
              >
                Internal
              </Checkbox>
            )}
          />
          <Controller
            control={control}
            name="accrual"
            render={({ field }) => (
              <Checkbox
                isChecked={!!field.value}
                onChange={(e) => field.onChange(e.target.checked)}
                isDisabled={busy}
              >
                Accrual
              </Checkbox>
            )}
          />
        </HStack>

        {canAttach && (
          <InvoiceFileAttachment
            ref={fileRef}
            jobsiteId={jobsiteId!}
            kind={invoiceKind!}
            initialDocumentId={initialDocumentId ?? null}
            isLoading={busy}
          />
        )}

        <Flex justify="flex-end" mt={2}>
          <Button
            type="submit"
            colorScheme="blue"
            size="sm"
            isLoading={busy}
          >
            Save invoice
          </Button>
        </Flex>
      </Flex>
    </form>
  );
};

export default InvoiceForm;
