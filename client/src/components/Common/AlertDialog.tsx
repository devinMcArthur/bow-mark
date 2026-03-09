import {
  AlertDialogProps,
  AlertDialog as AD,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  ModalHeaderProps,
  AlertDialogBody,
  AlertDialogFooter,
  ModalBodyProps,
  ModalFooterProps,
} from "@chakra-ui/react";
import React from "react";

interface IAlertDialog
  extends Omit<AlertDialogProps, "leastDestructiveRef" | "children"> {
  header?: React.ReactChild;
  headerProps?: ModalHeaderProps;
  body?: React.ReactChild;
  bodyProps?: ModalBodyProps;
  footer?: React.ReactChild;
  footerProps?: ModalFooterProps;
}

const AlertDialog = ({
  header,
  headerProps,
  body,
  bodyProps,
  footer,
  footerProps,
  ...props
}: IAlertDialog) => {
  /**
   * ----- Hook Initialization -----
   */

  const cancelRef = React.useRef(null);

  /**
   * ----- Rendering -----
   */
  return (
    <AD {...props} leastDestructiveRef={cancelRef}>
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogHeader {...headerProps}>{header}</AlertDialogHeader>

          <AlertDialogBody {...bodyProps}>{body}</AlertDialogBody>

          <AlertDialogFooter {...footerProps}>{footer}</AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AD>
  );
};

export default AlertDialog;
