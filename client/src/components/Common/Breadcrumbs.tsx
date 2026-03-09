import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from "@chakra-ui/react";
import Link from "next/link";

interface ICrumb {
  title: string;
  link?: string;
  isCurrentPage?: boolean;
}

interface IBreadcrumbs {
  crumbs: ICrumb[];
}

const Breadcrumbs = ({ crumbs }: IBreadcrumbs) => {
  return (
    <Breadcrumb>
      {crumbs.map((crumb, index) => (
        <BreadcrumbItem key={index}>
          {crumb.link ? (
            <Link passHref href={crumb.link}>
              <BreadcrumbLink
                href={crumb.link}
                isCurrentPage={crumb.isCurrentPage}
              >
                {crumb.title}
              </BreadcrumbLink>
            </Link>
          ) : (
            <BreadcrumbLink
              href={crumb.link}
              isCurrentPage={crumb.isCurrentPage}
            >
              {crumb.title}
            </BreadcrumbLink>
          )}
        </BreadcrumbItem>
      ))}
    </Breadcrumb>
  );
};

export default Breadcrumbs;
