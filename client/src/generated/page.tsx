import * as Types from './graphql';

import * as Operations from './graphql';
import { NextPage } from 'next';
import { NextRouter, useRouter } from 'next/router'
import { QueryHookOptions, useQuery } from '@apollo/client';
import * as Apollo from '@apollo/client';
import type React from 'react';
import { getApolloClient , ApolloClientContext} from '../withApollo';






































































export async function getServerPageCompanies
    (options: Omit<Apollo.QueryOptions<Types.CompaniesQueryVariables>, 'query'>, ctx: ApolloClientContext ){
        const apolloClient = getApolloClient(ctx);
        
        const data = await apolloClient.query<Types.CompaniesQuery>({ ...options, query: Operations.CompaniesDocument });
        
        const apolloState = apolloClient.cache.extract();

        return {
            props: {
                apolloState: apolloState,
                data: data?.data,
                error: data?.error ?? data?.errors ?? null,
            },
        };
      }
export const useCompanies = (
  optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.CompaniesQuery, Types.CompaniesQueryVariables>) => {
  const router = useRouter();
  const options = optionsFunc ? optionsFunc(router) : {};
  return useQuery(Operations.CompaniesDocument, options);
};
export type PageCompaniesComp = React.FC<{data?: Types.CompaniesQuery, error?: Apollo.ApolloError}>;
export const withPageCompanies = (optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.CompaniesQuery, Types.CompaniesQueryVariables>) => (WrappedComponent:PageCompaniesComp) : NextPage  => (props) => {
                const router = useRouter()
                const options = optionsFunc ? optionsFunc(router) : {};
                const {data, error } = useQuery(Operations.CompaniesDocument, options)    
                return <WrappedComponent {...props} data={data} error={error} /> ;
                   
            }; 
export const ssrCompanies = {
      getServerPage: getServerPageCompanies,
      withPage: withPageCompanies,
      usePage: useCompanies,
    }
export async function getServerPageCompanySearch
    (options: Omit<Apollo.QueryOptions<Types.CompanySearchQueryVariables>, 'query'>, ctx: ApolloClientContext ){
        const apolloClient = getApolloClient(ctx);
        
        const data = await apolloClient.query<Types.CompanySearchQuery>({ ...options, query: Operations.CompanySearchDocument });
        
        const apolloState = apolloClient.cache.extract();

        return {
            props: {
                apolloState: apolloState,
                data: data?.data,
                error: data?.error ?? data?.errors ?? null,
            },
        };
      }
export const useCompanySearch = (
  optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.CompanySearchQuery, Types.CompanySearchQueryVariables>) => {
  const router = useRouter();
  const options = optionsFunc ? optionsFunc(router) : {};
  return useQuery(Operations.CompanySearchDocument, options);
};
export type PageCompanySearchComp = React.FC<{data?: Types.CompanySearchQuery, error?: Apollo.ApolloError}>;
export const withPageCompanySearch = (optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.CompanySearchQuery, Types.CompanySearchQueryVariables>) => (WrappedComponent:PageCompanySearchComp) : NextPage  => (props) => {
                const router = useRouter()
                const options = optionsFunc ? optionsFunc(router) : {};
                const {data, error } = useQuery(Operations.CompanySearchDocument, options)    
                return <WrappedComponent {...props} data={data} error={error} /> ;
                   
            }; 
export const ssrCompanySearch = {
      getServerPage: getServerPageCompanySearch,
      withPage: withPageCompanySearch,
      usePage: useCompanySearch,
    }
export async function getServerPageCompanyCard
    (options: Omit<Apollo.QueryOptions<Types.CompanyCardQueryVariables>, 'query'>, ctx: ApolloClientContext ){
        const apolloClient = getApolloClient(ctx);
        
        const data = await apolloClient.query<Types.CompanyCardQuery>({ ...options, query: Operations.CompanyCardDocument });
        
        const apolloState = apolloClient.cache.extract();

        return {
            props: {
                apolloState: apolloState,
                data: data?.data,
                error: data?.error ?? data?.errors ?? null,
            },
        };
      }
export const useCompanyCard = (
  optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.CompanyCardQuery, Types.CompanyCardQueryVariables>) => {
  const router = useRouter();
  const options = optionsFunc ? optionsFunc(router) : {};
  return useQuery(Operations.CompanyCardDocument, options);
};
export type PageCompanyCardComp = React.FC<{data?: Types.CompanyCardQuery, error?: Apollo.ApolloError}>;
export const withPageCompanyCard = (optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.CompanyCardQuery, Types.CompanyCardQueryVariables>) => (WrappedComponent:PageCompanyCardComp) : NextPage  => (props) => {
                const router = useRouter()
                const options = optionsFunc ? optionsFunc(router) : {};
                const {data, error } = useQuery(Operations.CompanyCardDocument, options)    
                return <WrappedComponent {...props} data={data} error={error} /> ;
                   
            }; 
export const ssrCompanyCard = {
      getServerPage: getServerPageCompanyCard,
      withPage: withPageCompanyCard,
      usePage: useCompanyCard,
    }
export async function getServerPageCrewSearch
    (options: Omit<Apollo.QueryOptions<Types.CrewSearchQueryVariables>, 'query'>, ctx: ApolloClientContext ){
        const apolloClient = getApolloClient(ctx);
        
        const data = await apolloClient.query<Types.CrewSearchQuery>({ ...options, query: Operations.CrewSearchDocument });
        
        const apolloState = apolloClient.cache.extract();

        return {
            props: {
                apolloState: apolloState,
                data: data?.data,
                error: data?.error ?? data?.errors ?? null,
            },
        };
      }
export const useCrewSearch = (
  optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.CrewSearchQuery, Types.CrewSearchQueryVariables>) => {
  const router = useRouter();
  const options = optionsFunc ? optionsFunc(router) : {};
  return useQuery(Operations.CrewSearchDocument, options);
};
export type PageCrewSearchComp = React.FC<{data?: Types.CrewSearchQuery, error?: Apollo.ApolloError}>;
export const withPageCrewSearch = (optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.CrewSearchQuery, Types.CrewSearchQueryVariables>) => (WrappedComponent:PageCrewSearchComp) : NextPage  => (props) => {
                const router = useRouter()
                const options = optionsFunc ? optionsFunc(router) : {};
                const {data, error } = useQuery(Operations.CrewSearchDocument, options)    
                return <WrappedComponent {...props} data={data} error={error} /> ;
                   
            }; 
export const ssrCrewSearch = {
      getServerPage: getServerPageCrewSearch,
      withPage: withPageCrewSearch,
      usePage: useCrewSearch,
    }
export async function getServerPageCrewCard
    (options: Omit<Apollo.QueryOptions<Types.CrewCardQueryVariables>, 'query'>, ctx: ApolloClientContext ){
        const apolloClient = getApolloClient(ctx);
        
        const data = await apolloClient.query<Types.CrewCardQuery>({ ...options, query: Operations.CrewCardDocument });
        
        const apolloState = apolloClient.cache.extract();

        return {
            props: {
                apolloState: apolloState,
                data: data?.data,
                error: data?.error ?? data?.errors ?? null,
            },
        };
      }
export const useCrewCard = (
  optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.CrewCardQuery, Types.CrewCardQueryVariables>) => {
  const router = useRouter();
  const options = optionsFunc ? optionsFunc(router) : {};
  return useQuery(Operations.CrewCardDocument, options);
};
export type PageCrewCardComp = React.FC<{data?: Types.CrewCardQuery, error?: Apollo.ApolloError}>;
export const withPageCrewCard = (optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.CrewCardQuery, Types.CrewCardQueryVariables>) => (WrappedComponent:PageCrewCardComp) : NextPage  => (props) => {
                const router = useRouter()
                const options = optionsFunc ? optionsFunc(router) : {};
                const {data, error } = useQuery(Operations.CrewCardDocument, options)    
                return <WrappedComponent {...props} data={data} error={error} /> ;
                   
            }; 
export const ssrCrewCard = {
      getServerPage: getServerPageCrewCard,
      withPage: withPageCrewCard,
      usePage: useCrewCard,
    }
export async function getServerPageCrewFull
    (options: Omit<Apollo.QueryOptions<Types.CrewFullQueryVariables>, 'query'>, ctx: ApolloClientContext ){
        const apolloClient = getApolloClient(ctx);
        
        const data = await apolloClient.query<Types.CrewFullQuery>({ ...options, query: Operations.CrewFullDocument });
        
        const apolloState = apolloClient.cache.extract();

        return {
            props: {
                apolloState: apolloState,
                data: data?.data,
                error: data?.error ?? data?.errors ?? null,
            },
        };
      }
export const useCrewFull = (
  optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.CrewFullQuery, Types.CrewFullQueryVariables>) => {
  const router = useRouter();
  const options = optionsFunc ? optionsFunc(router) : {};
  return useQuery(Operations.CrewFullDocument, options);
};
export type PageCrewFullComp = React.FC<{data?: Types.CrewFullQuery, error?: Apollo.ApolloError}>;
export const withPageCrewFull = (optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.CrewFullQuery, Types.CrewFullQueryVariables>) => (WrappedComponent:PageCrewFullComp) : NextPage  => (props) => {
                const router = useRouter()
                const options = optionsFunc ? optionsFunc(router) : {};
                const {data, error } = useQuery(Operations.CrewFullDocument, options)    
                return <WrappedComponent {...props} data={data} error={error} /> ;
                   
            }; 
export const ssrCrewFull = {
      getServerPage: getServerPageCrewFull,
      withPage: withPageCrewFull,
      usePage: useCrewFull,
    }
export async function getServerPageCrewSsr
    (options: Omit<Apollo.QueryOptions<Types.CrewSsrQueryVariables>, 'query'>, ctx: ApolloClientContext ){
        const apolloClient = getApolloClient(ctx);
        
        const data = await apolloClient.query<Types.CrewSsrQuery>({ ...options, query: Operations.CrewSsrDocument });
        
        const apolloState = apolloClient.cache.extract();

        return {
            props: {
                apolloState: apolloState,
                data: data?.data,
                error: data?.error ?? data?.errors ?? null,
            },
        };
      }
export const useCrewSsr = (
  optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.CrewSsrQuery, Types.CrewSsrQueryVariables>) => {
  const router = useRouter();
  const options = optionsFunc ? optionsFunc(router) : {};
  return useQuery(Operations.CrewSsrDocument, options);
};
export type PageCrewSsrComp = React.FC<{data?: Types.CrewSsrQuery, error?: Apollo.ApolloError}>;
export const withPageCrewSsr = (optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.CrewSsrQuery, Types.CrewSsrQueryVariables>) => (WrappedComponent:PageCrewSsrComp) : NextPage  => (props) => {
                const router = useRouter()
                const options = optionsFunc ? optionsFunc(router) : {};
                const {data, error } = useQuery(Operations.CrewSsrDocument, options)    
                return <WrappedComponent {...props} data={data} error={error} /> ;
                   
            }; 
export const ssrCrewSsr = {
      getServerPage: getServerPageCrewSsr,
      withPage: withPageCrewSsr,
      usePage: useCrewSsr,
    }
export async function getServerPageCurrentUser
    (options: Omit<Apollo.QueryOptions<Types.CurrentUserQueryVariables>, 'query'>, ctx: ApolloClientContext ){
        const apolloClient = getApolloClient(ctx);
        
        const data = await apolloClient.query<Types.CurrentUserQuery>({ ...options, query: Operations.CurrentUserDocument });
        
        const apolloState = apolloClient.cache.extract();

        return {
            props: {
                apolloState: apolloState,
                data: data?.data,
                error: data?.error ?? data?.errors ?? null,
            },
        };
      }
export const useCurrentUser = (
  optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.CurrentUserQuery, Types.CurrentUserQueryVariables>) => {
  const router = useRouter();
  const options = optionsFunc ? optionsFunc(router) : {};
  return useQuery(Operations.CurrentUserDocument, options);
};
export type PageCurrentUserComp = React.FC<{data?: Types.CurrentUserQuery, error?: Apollo.ApolloError}>;
export const withPageCurrentUser = (optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.CurrentUserQuery, Types.CurrentUserQueryVariables>) => (WrappedComponent:PageCurrentUserComp) : NextPage  => (props) => {
                const router = useRouter()
                const options = optionsFunc ? optionsFunc(router) : {};
                const {data, error } = useQuery(Operations.CurrentUserDocument, options)    
                return <WrappedComponent {...props} data={data} error={error} /> ;
                   
            }; 
export const ssrCurrentUser = {
      getServerPage: getServerPageCurrentUser,
      withPage: withPageCurrentUser,
      usePage: useCurrentUser,
    }
export async function getServerPageDailyReportCard
    (options: Omit<Apollo.QueryOptions<Types.DailyReportCardQueryVariables>, 'query'>, ctx: ApolloClientContext ){
        const apolloClient = getApolloClient(ctx);
        
        const data = await apolloClient.query<Types.DailyReportCardQuery>({ ...options, query: Operations.DailyReportCardDocument });
        
        const apolloState = apolloClient.cache.extract();

        return {
            props: {
                apolloState: apolloState,
                data: data?.data,
                error: data?.error ?? data?.errors ?? null,
            },
        };
      }
export const useDailyReportCard = (
  optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.DailyReportCardQuery, Types.DailyReportCardQueryVariables>) => {
  const router = useRouter();
  const options = optionsFunc ? optionsFunc(router) : {};
  return useQuery(Operations.DailyReportCardDocument, options);
};
export type PageDailyReportCardComp = React.FC<{data?: Types.DailyReportCardQuery, error?: Apollo.ApolloError}>;
export const withPageDailyReportCard = (optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.DailyReportCardQuery, Types.DailyReportCardQueryVariables>) => (WrappedComponent:PageDailyReportCardComp) : NextPage  => (props) => {
                const router = useRouter()
                const options = optionsFunc ? optionsFunc(router) : {};
                const {data, error } = useQuery(Operations.DailyReportCardDocument, options)    
                return <WrappedComponent {...props} data={data} error={error} /> ;
                   
            }; 
export const ssrDailyReportCard = {
      getServerPage: getServerPageDailyReportCard,
      withPage: withPageDailyReportCard,
      usePage: useDailyReportCard,
    }
export async function getServerPageDailyReportFull
    (options: Omit<Apollo.QueryOptions<Types.DailyReportFullQueryVariables>, 'query'>, ctx: ApolloClientContext ){
        const apolloClient = getApolloClient(ctx);
        
        const data = await apolloClient.query<Types.DailyReportFullQuery>({ ...options, query: Operations.DailyReportFullDocument });
        
        const apolloState = apolloClient.cache.extract();

        return {
            props: {
                apolloState: apolloState,
                data: data?.data,
                error: data?.error ?? data?.errors ?? null,
            },
        };
      }
export const useDailyReportFull = (
  optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.DailyReportFullQuery, Types.DailyReportFullQueryVariables>) => {
  const router = useRouter();
  const options = optionsFunc ? optionsFunc(router) : {};
  return useQuery(Operations.DailyReportFullDocument, options);
};
export type PageDailyReportFullComp = React.FC<{data?: Types.DailyReportFullQuery, error?: Apollo.ApolloError}>;
export const withPageDailyReportFull = (optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.DailyReportFullQuery, Types.DailyReportFullQueryVariables>) => (WrappedComponent:PageDailyReportFullComp) : NextPage  => (props) => {
                const router = useRouter()
                const options = optionsFunc ? optionsFunc(router) : {};
                const {data, error } = useQuery(Operations.DailyReportFullDocument, options)    
                return <WrappedComponent {...props} data={data} error={error} /> ;
                   
            }; 
export const ssrDailyReportFull = {
      getServerPage: getServerPageDailyReportFull,
      withPage: withPageDailyReportFull,
      usePage: useDailyReportFull,
    }
export async function getServerPageDailyReportPdf
    (options: Omit<Apollo.QueryOptions<Types.DailyReportPdfQueryVariables>, 'query'>, ctx: ApolloClientContext ){
        const apolloClient = getApolloClient(ctx);
        
        const data = await apolloClient.query<Types.DailyReportPdfQuery>({ ...options, query: Operations.DailyReportPdfDocument });
        
        const apolloState = apolloClient.cache.extract();

        return {
            props: {
                apolloState: apolloState,
                data: data?.data,
                error: data?.error ?? data?.errors ?? null,
            },
        };
      }
export const useDailyReportPdf = (
  optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.DailyReportPdfQuery, Types.DailyReportPdfQueryVariables>) => {
  const router = useRouter();
  const options = optionsFunc ? optionsFunc(router) : {};
  return useQuery(Operations.DailyReportPdfDocument, options);
};
export type PageDailyReportPdfComp = React.FC<{data?: Types.DailyReportPdfQuery, error?: Apollo.ApolloError}>;
export const withPageDailyReportPdf = (optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.DailyReportPdfQuery, Types.DailyReportPdfQueryVariables>) => (WrappedComponent:PageDailyReportPdfComp) : NextPage  => (props) => {
                const router = useRouter()
                const options = optionsFunc ? optionsFunc(router) : {};
                const {data, error } = useQuery(Operations.DailyReportPdfDocument, options)    
                return <WrappedComponent {...props} data={data} error={error} /> ;
                   
            }; 
export const ssrDailyReportPdf = {
      getServerPage: getServerPageDailyReportPdf,
      withPage: withPageDailyReportPdf,
      usePage: useDailyReportPdf,
    }
export async function getServerPageDailyReportSsr
    (options: Omit<Apollo.QueryOptions<Types.DailyReportSsrQueryVariables>, 'query'>, ctx: ApolloClientContext ){
        const apolloClient = getApolloClient(ctx);
        
        const data = await apolloClient.query<Types.DailyReportSsrQuery>({ ...options, query: Operations.DailyReportSsrDocument });
        
        const apolloState = apolloClient.cache.extract();

        return {
            props: {
                apolloState: apolloState,
                data: data?.data,
                error: data?.error ?? data?.errors ?? null,
            },
        };
      }
export const useDailyReportSsr = (
  optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.DailyReportSsrQuery, Types.DailyReportSsrQueryVariables>) => {
  const router = useRouter();
  const options = optionsFunc ? optionsFunc(router) : {};
  return useQuery(Operations.DailyReportSsrDocument, options);
};
export type PageDailyReportSsrComp = React.FC<{data?: Types.DailyReportSsrQuery, error?: Apollo.ApolloError}>;
export const withPageDailyReportSsr = (optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.DailyReportSsrQuery, Types.DailyReportSsrQueryVariables>) => (WrappedComponent:PageDailyReportSsrComp) : NextPage  => (props) => {
                const router = useRouter()
                const options = optionsFunc ? optionsFunc(router) : {};
                const {data, error } = useQuery(Operations.DailyReportSsrDocument, options)    
                return <WrappedComponent {...props} data={data} error={error} /> ;
                   
            }; 
export const ssrDailyReportSsr = {
      getServerPage: getServerPageDailyReportSsr,
      withPage: withPageDailyReportSsr,
      usePage: useDailyReportSsr,
    }
export async function getServerPageDailyReports
    (options: Omit<Apollo.QueryOptions<Types.DailyReportsQueryVariables>, 'query'>, ctx: ApolloClientContext ){
        const apolloClient = getApolloClient(ctx);
        
        const data = await apolloClient.query<Types.DailyReportsQuery>({ ...options, query: Operations.DailyReportsDocument });
        
        const apolloState = apolloClient.cache.extract();

        return {
            props: {
                apolloState: apolloState,
                data: data?.data,
                error: data?.error ?? data?.errors ?? null,
            },
        };
      }
export const useDailyReports = (
  optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.DailyReportsQuery, Types.DailyReportsQueryVariables>) => {
  const router = useRouter();
  const options = optionsFunc ? optionsFunc(router) : {};
  return useQuery(Operations.DailyReportsDocument, options);
};
export type PageDailyReportsComp = React.FC<{data?: Types.DailyReportsQuery, error?: Apollo.ApolloError}>;
export const withPageDailyReports = (optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.DailyReportsQuery, Types.DailyReportsQueryVariables>) => (WrappedComponent:PageDailyReportsComp) : NextPage  => (props) => {
                const router = useRouter()
                const options = optionsFunc ? optionsFunc(router) : {};
                const {data, error } = useQuery(Operations.DailyReportsDocument, options)    
                return <WrappedComponent {...props} data={data} error={error} /> ;
                   
            }; 
export const ssrDailyReports = {
      getServerPage: getServerPageDailyReports,
      withPage: withPageDailyReports,
      usePage: useDailyReports,
    }
export async function getServerPageDailyReportsForJobsite
    (options: Omit<Apollo.QueryOptions<Types.DailyReportsForJobsiteQueryVariables>, 'query'>, ctx: ApolloClientContext ){
        const apolloClient = getApolloClient(ctx);
        
        const data = await apolloClient.query<Types.DailyReportsForJobsiteQuery>({ ...options, query: Operations.DailyReportsForJobsiteDocument });
        
        const apolloState = apolloClient.cache.extract();

        return {
            props: {
                apolloState: apolloState,
                data: data?.data,
                error: data?.error ?? data?.errors ?? null,
            },
        };
      }
export const useDailyReportsForJobsite = (
  optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.DailyReportsForJobsiteQuery, Types.DailyReportsForJobsiteQueryVariables>) => {
  const router = useRouter();
  const options = optionsFunc ? optionsFunc(router) : {};
  return useQuery(Operations.DailyReportsForJobsiteDocument, options);
};
export type PageDailyReportsForJobsiteComp = React.FC<{data?: Types.DailyReportsForJobsiteQuery, error?: Apollo.ApolloError}>;
export const withPageDailyReportsForJobsite = (optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.DailyReportsForJobsiteQuery, Types.DailyReportsForJobsiteQueryVariables>) => (WrappedComponent:PageDailyReportsForJobsiteComp) : NextPage  => (props) => {
                const router = useRouter()
                const options = optionsFunc ? optionsFunc(router) : {};
                const {data, error } = useQuery(Operations.DailyReportsForJobsiteDocument, options)    
                return <WrappedComponent {...props} data={data} error={error} /> ;
                   
            }; 
export const ssrDailyReportsForJobsite = {
      getServerPage: getServerPageDailyReportsForJobsite,
      withPage: withPageDailyReportsForJobsite,
      usePage: useDailyReportsForJobsite,
    }
export async function getServerPageEmployeeHourReports
    (options: Omit<Apollo.QueryOptions<Types.EmployeeHourReportsQueryVariables>, 'query'>, ctx: ApolloClientContext ){
        const apolloClient = getApolloClient(ctx);
        
        const data = await apolloClient.query<Types.EmployeeHourReportsQuery>({ ...options, query: Operations.EmployeeHourReportsDocument });
        
        const apolloState = apolloClient.cache.extract();

        return {
            props: {
                apolloState: apolloState,
                data: data?.data,
                error: data?.error ?? data?.errors ?? null,
            },
        };
      }
export const useEmployeeHourReports = (
  optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.EmployeeHourReportsQuery, Types.EmployeeHourReportsQueryVariables>) => {
  const router = useRouter();
  const options = optionsFunc ? optionsFunc(router) : {};
  return useQuery(Operations.EmployeeHourReportsDocument, options);
};
export type PageEmployeeHourReportsComp = React.FC<{data?: Types.EmployeeHourReportsQuery, error?: Apollo.ApolloError}>;
export const withPageEmployeeHourReports = (optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.EmployeeHourReportsQuery, Types.EmployeeHourReportsQueryVariables>) => (WrappedComponent:PageEmployeeHourReportsComp) : NextPage  => (props) => {
                const router = useRouter()
                const options = optionsFunc ? optionsFunc(router) : {};
                const {data, error } = useQuery(Operations.EmployeeHourReportsDocument, options)    
                return <WrappedComponent {...props} data={data} error={error} /> ;
                   
            }; 
export const ssrEmployeeHourReports = {
      getServerPage: getServerPageEmployeeHourReports,
      withPage: withPageEmployeeHourReports,
      usePage: useEmployeeHourReports,
    }
export async function getServerPageEmployeeSearch
    (options: Omit<Apollo.QueryOptions<Types.EmployeeSearchQueryVariables>, 'query'>, ctx: ApolloClientContext ){
        const apolloClient = getApolloClient(ctx);
        
        const data = await apolloClient.query<Types.EmployeeSearchQuery>({ ...options, query: Operations.EmployeeSearchDocument });
        
        const apolloState = apolloClient.cache.extract();

        return {
            props: {
                apolloState: apolloState,
                data: data?.data,
                error: data?.error ?? data?.errors ?? null,
            },
        };
      }
export const useEmployeeSearch = (
  optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.EmployeeSearchQuery, Types.EmployeeSearchQueryVariables>) => {
  const router = useRouter();
  const options = optionsFunc ? optionsFunc(router) : {};
  return useQuery(Operations.EmployeeSearchDocument, options);
};
export type PageEmployeeSearchComp = React.FC<{data?: Types.EmployeeSearchQuery, error?: Apollo.ApolloError}>;
export const withPageEmployeeSearch = (optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.EmployeeSearchQuery, Types.EmployeeSearchQueryVariables>) => (WrappedComponent:PageEmployeeSearchComp) : NextPage  => (props) => {
                const router = useRouter()
                const options = optionsFunc ? optionsFunc(router) : {};
                const {data, error } = useQuery(Operations.EmployeeSearchDocument, options)    
                return <WrappedComponent {...props} data={data} error={error} /> ;
                   
            }; 
export const ssrEmployeeSearch = {
      getServerPage: getServerPageEmployeeSearch,
      withPage: withPageEmployeeSearch,
      usePage: useEmployeeSearch,
    }
export async function getServerPageEmployeeFull
    (options: Omit<Apollo.QueryOptions<Types.EmployeeFullQueryVariables>, 'query'>, ctx: ApolloClientContext ){
        const apolloClient = getApolloClient(ctx);
        
        const data = await apolloClient.query<Types.EmployeeFullQuery>({ ...options, query: Operations.EmployeeFullDocument });
        
        const apolloState = apolloClient.cache.extract();

        return {
            props: {
                apolloState: apolloState,
                data: data?.data,
                error: data?.error ?? data?.errors ?? null,
            },
        };
      }
export const useEmployeeFull = (
  optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.EmployeeFullQuery, Types.EmployeeFullQueryVariables>) => {
  const router = useRouter();
  const options = optionsFunc ? optionsFunc(router) : {};
  return useQuery(Operations.EmployeeFullDocument, options);
};
export type PageEmployeeFullComp = React.FC<{data?: Types.EmployeeFullQuery, error?: Apollo.ApolloError}>;
export const withPageEmployeeFull = (optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.EmployeeFullQuery, Types.EmployeeFullQueryVariables>) => (WrappedComponent:PageEmployeeFullComp) : NextPage  => (props) => {
                const router = useRouter()
                const options = optionsFunc ? optionsFunc(router) : {};
                const {data, error } = useQuery(Operations.EmployeeFullDocument, options)    
                return <WrappedComponent {...props} data={data} error={error} /> ;
                   
            }; 
export const ssrEmployeeFull = {
      getServerPage: getServerPageEmployeeFull,
      withPage: withPageEmployeeFull,
      usePage: useEmployeeFull,
    }
export async function getServerPageEmployeeSsr
    (options: Omit<Apollo.QueryOptions<Types.EmployeeSsrQueryVariables>, 'query'>, ctx: ApolloClientContext ){
        const apolloClient = getApolloClient(ctx);
        
        const data = await apolloClient.query<Types.EmployeeSsrQuery>({ ...options, query: Operations.EmployeeSsrDocument });
        
        const apolloState = apolloClient.cache.extract();

        return {
            props: {
                apolloState: apolloState,
                data: data?.data,
                error: data?.error ?? data?.errors ?? null,
            },
        };
      }
export const useEmployeeSsr = (
  optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.EmployeeSsrQuery, Types.EmployeeSsrQueryVariables>) => {
  const router = useRouter();
  const options = optionsFunc ? optionsFunc(router) : {};
  return useQuery(Operations.EmployeeSsrDocument, options);
};
export type PageEmployeeSsrComp = React.FC<{data?: Types.EmployeeSsrQuery, error?: Apollo.ApolloError}>;
export const withPageEmployeeSsr = (optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.EmployeeSsrQuery, Types.EmployeeSsrQueryVariables>) => (WrappedComponent:PageEmployeeSsrComp) : NextPage  => (props) => {
                const router = useRouter()
                const options = optionsFunc ? optionsFunc(router) : {};
                const {data, error } = useQuery(Operations.EmployeeSsrDocument, options)    
                return <WrappedComponent {...props} data={data} error={error} /> ;
                   
            }; 
export const ssrEmployeeSsr = {
      getServerPage: getServerPageEmployeeSsr,
      withPage: withPageEmployeeSsr,
      usePage: useEmployeeSsr,
    }
export async function getServerPageEmployeeFetchSearch
    (options: Omit<Apollo.QueryOptions<Types.EmployeeFetchSearchQueryVariables>, 'query'>, ctx: ApolloClientContext ){
        const apolloClient = getApolloClient(ctx);
        
        const data = await apolloClient.query<Types.EmployeeFetchSearchQuery>({ ...options, query: Operations.EmployeeFetchSearchDocument });
        
        const apolloState = apolloClient.cache.extract();

        return {
            props: {
                apolloState: apolloState,
                data: data?.data,
                error: data?.error ?? data?.errors ?? null,
            },
        };
      }
export const useEmployeeFetchSearch = (
  optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.EmployeeFetchSearchQuery, Types.EmployeeFetchSearchQueryVariables>) => {
  const router = useRouter();
  const options = optionsFunc ? optionsFunc(router) : {};
  return useQuery(Operations.EmployeeFetchSearchDocument, options);
};
export type PageEmployeeFetchSearchComp = React.FC<{data?: Types.EmployeeFetchSearchQuery, error?: Apollo.ApolloError}>;
export const withPageEmployeeFetchSearch = (optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.EmployeeFetchSearchQuery, Types.EmployeeFetchSearchQueryVariables>) => (WrappedComponent:PageEmployeeFetchSearchComp) : NextPage  => (props) => {
                const router = useRouter()
                const options = optionsFunc ? optionsFunc(router) : {};
                const {data, error } = useQuery(Operations.EmployeeFetchSearchDocument, options)    
                return <WrappedComponent {...props} data={data} error={error} /> ;
                   
            }; 
export const ssrEmployeeFetchSearch = {
      getServerPage: getServerPageEmployeeFetchSearch,
      withPage: withPageEmployeeFetchSearch,
      usePage: useEmployeeFetchSearch,
    }
export async function getServerPageFileFull
    (options: Omit<Apollo.QueryOptions<Types.FileFullQueryVariables>, 'query'>, ctx: ApolloClientContext ){
        const apolloClient = getApolloClient(ctx);
        
        const data = await apolloClient.query<Types.FileFullQuery>({ ...options, query: Operations.FileFullDocument });
        
        const apolloState = apolloClient.cache.extract();

        return {
            props: {
                apolloState: apolloState,
                data: data?.data,
                error: data?.error ?? data?.errors ?? null,
            },
        };
      }
export const useFileFull = (
  optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.FileFullQuery, Types.FileFullQueryVariables>) => {
  const router = useRouter();
  const options = optionsFunc ? optionsFunc(router) : {};
  return useQuery(Operations.FileFullDocument, options);
};
export type PageFileFullComp = React.FC<{data?: Types.FileFullQuery, error?: Apollo.ApolloError}>;
export const withPageFileFull = (optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.FileFullQuery, Types.FileFullQueryVariables>) => (WrappedComponent:PageFileFullComp) : NextPage  => (props) => {
                const router = useRouter()
                const options = optionsFunc ? optionsFunc(router) : {};
                const {data, error } = useQuery(Operations.FileFullDocument, options)    
                return <WrappedComponent {...props} data={data} error={error} /> ;
                   
            }; 
export const ssrFileFull = {
      getServerPage: getServerPageFileFull,
      withPage: withPageFileFull,
      usePage: useFileFull,
    }
export async function getServerPageJobsiteMasterExcelReportByDate
    (options: Omit<Apollo.QueryOptions<Types.JobsiteMasterExcelReportByDateQueryVariables>, 'query'>, ctx: ApolloClientContext ){
        const apolloClient = getApolloClient(ctx);
        
        const data = await apolloClient.query<Types.JobsiteMasterExcelReportByDateQuery>({ ...options, query: Operations.JobsiteMasterExcelReportByDateDocument });
        
        const apolloState = apolloClient.cache.extract();

        return {
            props: {
                apolloState: apolloState,
                data: data?.data,
                error: data?.error ?? data?.errors ?? null,
            },
        };
      }
export const useJobsiteMasterExcelReportByDate = (
  optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.JobsiteMasterExcelReportByDateQuery, Types.JobsiteMasterExcelReportByDateQueryVariables>) => {
  const router = useRouter();
  const options = optionsFunc ? optionsFunc(router) : {};
  return useQuery(Operations.JobsiteMasterExcelReportByDateDocument, options);
};
export type PageJobsiteMasterExcelReportByDateComp = React.FC<{data?: Types.JobsiteMasterExcelReportByDateQuery, error?: Apollo.ApolloError}>;
export const withPageJobsiteMasterExcelReportByDate = (optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.JobsiteMasterExcelReportByDateQuery, Types.JobsiteMasterExcelReportByDateQueryVariables>) => (WrappedComponent:PageJobsiteMasterExcelReportByDateComp) : NextPage  => (props) => {
                const router = useRouter()
                const options = optionsFunc ? optionsFunc(router) : {};
                const {data, error } = useQuery(Operations.JobsiteMasterExcelReportByDateDocument, options)    
                return <WrappedComponent {...props} data={data} error={error} /> ;
                   
            }; 
export const ssrJobsiteMasterExcelReportByDate = {
      getServerPage: getServerPageJobsiteMasterExcelReportByDate,
      withPage: withPageJobsiteMasterExcelReportByDate,
      usePage: useJobsiteMasterExcelReportByDate,
    }
export async function getServerPageJobsiteMonthReportCard
    (options: Omit<Apollo.QueryOptions<Types.JobsiteMonthReportCardQueryVariables>, 'query'>, ctx: ApolloClientContext ){
        const apolloClient = getApolloClient(ctx);
        
        const data = await apolloClient.query<Types.JobsiteMonthReportCardQuery>({ ...options, query: Operations.JobsiteMonthReportCardDocument });
        
        const apolloState = apolloClient.cache.extract();

        return {
            props: {
                apolloState: apolloState,
                data: data?.data,
                error: data?.error ?? data?.errors ?? null,
            },
        };
      }
export const useJobsiteMonthReportCard = (
  optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.JobsiteMonthReportCardQuery, Types.JobsiteMonthReportCardQueryVariables>) => {
  const router = useRouter();
  const options = optionsFunc ? optionsFunc(router) : {};
  return useQuery(Operations.JobsiteMonthReportCardDocument, options);
};
export type PageJobsiteMonthReportCardComp = React.FC<{data?: Types.JobsiteMonthReportCardQuery, error?: Apollo.ApolloError}>;
export const withPageJobsiteMonthReportCard = (optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.JobsiteMonthReportCardQuery, Types.JobsiteMonthReportCardQueryVariables>) => (WrappedComponent:PageJobsiteMonthReportCardComp) : NextPage  => (props) => {
                const router = useRouter()
                const options = optionsFunc ? optionsFunc(router) : {};
                const {data, error } = useQuery(Operations.JobsiteMonthReportCardDocument, options)    
                return <WrappedComponent {...props} data={data} error={error} /> ;
                   
            }; 
export const ssrJobsiteMonthReportCard = {
      getServerPage: getServerPageJobsiteMonthReportCard,
      withPage: withPageJobsiteMonthReportCard,
      usePage: useJobsiteMonthReportCard,
    }
export async function getServerPageJobsiteMonthReportFull
    (options: Omit<Apollo.QueryOptions<Types.JobsiteMonthReportFullQueryVariables>, 'query'>, ctx: ApolloClientContext ){
        const apolloClient = getApolloClient(ctx);
        
        const data = await apolloClient.query<Types.JobsiteMonthReportFullQuery>({ ...options, query: Operations.JobsiteMonthReportFullDocument });
        
        const apolloState = apolloClient.cache.extract();

        return {
            props: {
                apolloState: apolloState,
                data: data?.data,
                error: data?.error ?? data?.errors ?? null,
            },
        };
      }
export const useJobsiteMonthReportFull = (
  optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.JobsiteMonthReportFullQuery, Types.JobsiteMonthReportFullQueryVariables>) => {
  const router = useRouter();
  const options = optionsFunc ? optionsFunc(router) : {};
  return useQuery(Operations.JobsiteMonthReportFullDocument, options);
};
export type PageJobsiteMonthReportFullComp = React.FC<{data?: Types.JobsiteMonthReportFullQuery, error?: Apollo.ApolloError}>;
export const withPageJobsiteMonthReportFull = (optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.JobsiteMonthReportFullQuery, Types.JobsiteMonthReportFullQueryVariables>) => (WrappedComponent:PageJobsiteMonthReportFullComp) : NextPage  => (props) => {
                const router = useRouter()
                const options = optionsFunc ? optionsFunc(router) : {};
                const {data, error } = useQuery(Operations.JobsiteMonthReportFullDocument, options)    
                return <WrappedComponent {...props} data={data} error={error} /> ;
                   
            }; 
export const ssrJobsiteMonthReportFull = {
      getServerPage: getServerPageJobsiteMonthReportFull,
      withPage: withPageJobsiteMonthReportFull,
      usePage: useJobsiteMonthReportFull,
    }
export async function getServerPageJobsiteSearch
    (options: Omit<Apollo.QueryOptions<Types.JobsiteSearchQueryVariables>, 'query'>, ctx: ApolloClientContext ){
        const apolloClient = getApolloClient(ctx);
        
        const data = await apolloClient.query<Types.JobsiteSearchQuery>({ ...options, query: Operations.JobsiteSearchDocument });
        
        const apolloState = apolloClient.cache.extract();

        return {
            props: {
                apolloState: apolloState,
                data: data?.data,
                error: data?.error ?? data?.errors ?? null,
            },
        };
      }
export const useJobsiteSearch = (
  optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.JobsiteSearchQuery, Types.JobsiteSearchQueryVariables>) => {
  const router = useRouter();
  const options = optionsFunc ? optionsFunc(router) : {};
  return useQuery(Operations.JobsiteSearchDocument, options);
};
export type PageJobsiteSearchComp = React.FC<{data?: Types.JobsiteSearchQuery, error?: Apollo.ApolloError}>;
export const withPageJobsiteSearch = (optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.JobsiteSearchQuery, Types.JobsiteSearchQueryVariables>) => (WrappedComponent:PageJobsiteSearchComp) : NextPage  => (props) => {
                const router = useRouter()
                const options = optionsFunc ? optionsFunc(router) : {};
                const {data, error } = useQuery(Operations.JobsiteSearchDocument, options)    
                return <WrappedComponent {...props} data={data} error={error} /> ;
                   
            }; 
export const ssrJobsiteSearch = {
      getServerPage: getServerPageJobsiteSearch,
      withPage: withPageJobsiteSearch,
      usePage: useJobsiteSearch,
    }
export async function getServerPageJobsiteYearMasterReportCurrent
    (options: Omit<Apollo.QueryOptions<Types.JobsiteYearMasterReportCurrentQueryVariables>, 'query'>, ctx: ApolloClientContext ){
        const apolloClient = getApolloClient(ctx);
        
        const data = await apolloClient.query<Types.JobsiteYearMasterReportCurrentQuery>({ ...options, query: Operations.JobsiteYearMasterReportCurrentDocument });
        
        const apolloState = apolloClient.cache.extract();

        return {
            props: {
                apolloState: apolloState,
                data: data?.data,
                error: data?.error ?? data?.errors ?? null,
            },
        };
      }
export const useJobsiteYearMasterReportCurrent = (
  optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.JobsiteYearMasterReportCurrentQuery, Types.JobsiteYearMasterReportCurrentQueryVariables>) => {
  const router = useRouter();
  const options = optionsFunc ? optionsFunc(router) : {};
  return useQuery(Operations.JobsiteYearMasterReportCurrentDocument, options);
};
export type PageJobsiteYearMasterReportCurrentComp = React.FC<{data?: Types.JobsiteYearMasterReportCurrentQuery, error?: Apollo.ApolloError}>;
export const withPageJobsiteYearMasterReportCurrent = (optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.JobsiteYearMasterReportCurrentQuery, Types.JobsiteYearMasterReportCurrentQueryVariables>) => (WrappedComponent:PageJobsiteYearMasterReportCurrentComp) : NextPage  => (props) => {
                const router = useRouter()
                const options = optionsFunc ? optionsFunc(router) : {};
                const {data, error } = useQuery(Operations.JobsiteYearMasterReportCurrentDocument, options)    
                return <WrappedComponent {...props} data={data} error={error} /> ;
                   
            }; 
export const ssrJobsiteYearMasterReportCurrent = {
      getServerPage: getServerPageJobsiteYearMasterReportCurrent,
      withPage: withPageJobsiteYearMasterReportCurrent,
      usePage: useJobsiteYearMasterReportCurrent,
    }
export async function getServerPageJobsiteYearMasterReportCard
    (options: Omit<Apollo.QueryOptions<Types.JobsiteYearMasterReportCardQueryVariables>, 'query'>, ctx: ApolloClientContext ){
        const apolloClient = getApolloClient(ctx);
        
        const data = await apolloClient.query<Types.JobsiteYearMasterReportCardQuery>({ ...options, query: Operations.JobsiteYearMasterReportCardDocument });
        
        const apolloState = apolloClient.cache.extract();

        return {
            props: {
                apolloState: apolloState,
                data: data?.data,
                error: data?.error ?? data?.errors ?? null,
            },
        };
      }
export const useJobsiteYearMasterReportCard = (
  optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.JobsiteYearMasterReportCardQuery, Types.JobsiteYearMasterReportCardQueryVariables>) => {
  const router = useRouter();
  const options = optionsFunc ? optionsFunc(router) : {};
  return useQuery(Operations.JobsiteYearMasterReportCardDocument, options);
};
export type PageJobsiteYearMasterReportCardComp = React.FC<{data?: Types.JobsiteYearMasterReportCardQuery, error?: Apollo.ApolloError}>;
export const withPageJobsiteYearMasterReportCard = (optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.JobsiteYearMasterReportCardQuery, Types.JobsiteYearMasterReportCardQueryVariables>) => (WrappedComponent:PageJobsiteYearMasterReportCardComp) : NextPage  => (props) => {
                const router = useRouter()
                const options = optionsFunc ? optionsFunc(router) : {};
                const {data, error } = useQuery(Operations.JobsiteYearMasterReportCardDocument, options)    
                return <WrappedComponent {...props} data={data} error={error} /> ;
                   
            }; 
export const ssrJobsiteYearMasterReportCard = {
      getServerPage: getServerPageJobsiteYearMasterReportCard,
      withPage: withPageJobsiteYearMasterReportCard,
      usePage: useJobsiteYearMasterReportCard,
    }
export async function getServerPageJobsiteYearMasterReportFull
    (options: Omit<Apollo.QueryOptions<Types.JobsiteYearMasterReportFullQueryVariables>, 'query'>, ctx: ApolloClientContext ){
        const apolloClient = getApolloClient(ctx);
        
        const data = await apolloClient.query<Types.JobsiteYearMasterReportFullQuery>({ ...options, query: Operations.JobsiteYearMasterReportFullDocument });
        
        const apolloState = apolloClient.cache.extract();

        return {
            props: {
                apolloState: apolloState,
                data: data?.data,
                error: data?.error ?? data?.errors ?? null,
            },
        };
      }
export const useJobsiteYearMasterReportFull = (
  optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.JobsiteYearMasterReportFullQuery, Types.JobsiteYearMasterReportFullQueryVariables>) => {
  const router = useRouter();
  const options = optionsFunc ? optionsFunc(router) : {};
  return useQuery(Operations.JobsiteYearMasterReportFullDocument, options);
};
export type PageJobsiteYearMasterReportFullComp = React.FC<{data?: Types.JobsiteYearMasterReportFullQuery, error?: Apollo.ApolloError}>;
export const withPageJobsiteYearMasterReportFull = (optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.JobsiteYearMasterReportFullQuery, Types.JobsiteYearMasterReportFullQueryVariables>) => (WrappedComponent:PageJobsiteYearMasterReportFullComp) : NextPage  => (props) => {
                const router = useRouter()
                const options = optionsFunc ? optionsFunc(router) : {};
                const {data, error } = useQuery(Operations.JobsiteYearMasterReportFullDocument, options)    
                return <WrappedComponent {...props} data={data} error={error} /> ;
                   
            }; 
export const ssrJobsiteYearMasterReportFull = {
      getServerPage: getServerPageJobsiteYearMasterReportFull,
      withPage: withPageJobsiteYearMasterReportFull,
      usePage: useJobsiteYearMasterReportFull,
    }
export async function getServerPageJobsiteYearMasterReports
    (options: Omit<Apollo.QueryOptions<Types.JobsiteYearMasterReportsQueryVariables>, 'query'>, ctx: ApolloClientContext ){
        const apolloClient = getApolloClient(ctx);
        
        const data = await apolloClient.query<Types.JobsiteYearMasterReportsQuery>({ ...options, query: Operations.JobsiteYearMasterReportsDocument });
        
        const apolloState = apolloClient.cache.extract();

        return {
            props: {
                apolloState: apolloState,
                data: data?.data,
                error: data?.error ?? data?.errors ?? null,
            },
        };
      }
export const useJobsiteYearMasterReports = (
  optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.JobsiteYearMasterReportsQuery, Types.JobsiteYearMasterReportsQueryVariables>) => {
  const router = useRouter();
  const options = optionsFunc ? optionsFunc(router) : {};
  return useQuery(Operations.JobsiteYearMasterReportsDocument, options);
};
export type PageJobsiteYearMasterReportsComp = React.FC<{data?: Types.JobsiteYearMasterReportsQuery, error?: Apollo.ApolloError}>;
export const withPageJobsiteYearMasterReports = (optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.JobsiteYearMasterReportsQuery, Types.JobsiteYearMasterReportsQueryVariables>) => (WrappedComponent:PageJobsiteYearMasterReportsComp) : NextPage  => (props) => {
                const router = useRouter()
                const options = optionsFunc ? optionsFunc(router) : {};
                const {data, error } = useQuery(Operations.JobsiteYearMasterReportsDocument, options)    
                return <WrappedComponent {...props} data={data} error={error} /> ;
                   
            }; 
export const ssrJobsiteYearMasterReports = {
      getServerPage: getServerPageJobsiteYearMasterReports,
      withPage: withPageJobsiteYearMasterReports,
      usePage: useJobsiteYearMasterReports,
    }
export async function getServerPageJobsiteYearReportCard
    (options: Omit<Apollo.QueryOptions<Types.JobsiteYearReportCardQueryVariables>, 'query'>, ctx: ApolloClientContext ){
        const apolloClient = getApolloClient(ctx);
        
        const data = await apolloClient.query<Types.JobsiteYearReportCardQuery>({ ...options, query: Operations.JobsiteYearReportCardDocument });
        
        const apolloState = apolloClient.cache.extract();

        return {
            props: {
                apolloState: apolloState,
                data: data?.data,
                error: data?.error ?? data?.errors ?? null,
            },
        };
      }
export const useJobsiteYearReportCard = (
  optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.JobsiteYearReportCardQuery, Types.JobsiteYearReportCardQueryVariables>) => {
  const router = useRouter();
  const options = optionsFunc ? optionsFunc(router) : {};
  return useQuery(Operations.JobsiteYearReportCardDocument, options);
};
export type PageJobsiteYearReportCardComp = React.FC<{data?: Types.JobsiteYearReportCardQuery, error?: Apollo.ApolloError}>;
export const withPageJobsiteYearReportCard = (optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.JobsiteYearReportCardQuery, Types.JobsiteYearReportCardQueryVariables>) => (WrappedComponent:PageJobsiteYearReportCardComp) : NextPage  => (props) => {
                const router = useRouter()
                const options = optionsFunc ? optionsFunc(router) : {};
                const {data, error } = useQuery(Operations.JobsiteYearReportCardDocument, options)    
                return <WrappedComponent {...props} data={data} error={error} /> ;
                   
            }; 
export const ssrJobsiteYearReportCard = {
      getServerPage: getServerPageJobsiteYearReportCard,
      withPage: withPageJobsiteYearReportCard,
      usePage: useJobsiteYearReportCard,
    }
export async function getServerPageJobsiteYearReportFull
    (options: Omit<Apollo.QueryOptions<Types.JobsiteYearReportFullQueryVariables>, 'query'>, ctx: ApolloClientContext ){
        const apolloClient = getApolloClient(ctx);
        
        const data = await apolloClient.query<Types.JobsiteYearReportFullQuery>({ ...options, query: Operations.JobsiteYearReportFullDocument });
        
        const apolloState = apolloClient.cache.extract();

        return {
            props: {
                apolloState: apolloState,
                data: data?.data,
                error: data?.error ?? data?.errors ?? null,
            },
        };
      }
export const useJobsiteYearReportFull = (
  optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.JobsiteYearReportFullQuery, Types.JobsiteYearReportFullQueryVariables>) => {
  const router = useRouter();
  const options = optionsFunc ? optionsFunc(router) : {};
  return useQuery(Operations.JobsiteYearReportFullDocument, options);
};
export type PageJobsiteYearReportFullComp = React.FC<{data?: Types.JobsiteYearReportFullQuery, error?: Apollo.ApolloError}>;
export const withPageJobsiteYearReportFull = (optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.JobsiteYearReportFullQuery, Types.JobsiteYearReportFullQueryVariables>) => (WrappedComponent:PageJobsiteYearReportFullComp) : NextPage  => (props) => {
                const router = useRouter()
                const options = optionsFunc ? optionsFunc(router) : {};
                const {data, error } = useQuery(Operations.JobsiteYearReportFullDocument, options)    
                return <WrappedComponent {...props} data={data} error={error} /> ;
                   
            }; 
export const ssrJobsiteYearReportFull = {
      getServerPage: getServerPageJobsiteYearReportFull,
      withPage: withPageJobsiteYearReportFull,
      usePage: useJobsiteYearReportFull,
    }
export async function getServerPageJobsiteYearReportSummary
    (options: Omit<Apollo.QueryOptions<Types.JobsiteYearReportSummaryQueryVariables>, 'query'>, ctx: ApolloClientContext ){
        const apolloClient = getApolloClient(ctx);
        
        const data = await apolloClient.query<Types.JobsiteYearReportSummaryQuery>({ ...options, query: Operations.JobsiteYearReportSummaryDocument });
        
        const apolloState = apolloClient.cache.extract();

        return {
            props: {
                apolloState: apolloState,
                data: data?.data,
                error: data?.error ?? data?.errors ?? null,
            },
        };
      }
export const useJobsiteYearReportSummary = (
  optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.JobsiteYearReportSummaryQuery, Types.JobsiteYearReportSummaryQueryVariables>) => {
  const router = useRouter();
  const options = optionsFunc ? optionsFunc(router) : {};
  return useQuery(Operations.JobsiteYearReportSummaryDocument, options);
};
export type PageJobsiteYearReportSummaryComp = React.FC<{data?: Types.JobsiteYearReportSummaryQuery, error?: Apollo.ApolloError}>;
export const withPageJobsiteYearReportSummary = (optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.JobsiteYearReportSummaryQuery, Types.JobsiteYearReportSummaryQueryVariables>) => (WrappedComponent:PageJobsiteYearReportSummaryComp) : NextPage  => (props) => {
                const router = useRouter()
                const options = optionsFunc ? optionsFunc(router) : {};
                const {data, error } = useQuery(Operations.JobsiteYearReportSummaryDocument, options)    
                return <WrappedComponent {...props} data={data} error={error} /> ;
                   
            }; 
export const ssrJobsiteYearReportSummary = {
      getServerPage: getServerPageJobsiteYearReportSummary,
      withPage: withPageJobsiteYearReportSummary,
      usePage: useJobsiteYearReportSummary,
    }
export async function getServerPageJobsiteFull
    (options: Omit<Apollo.QueryOptions<Types.JobsiteFullQueryVariables>, 'query'>, ctx: ApolloClientContext ){
        const apolloClient = getApolloClient(ctx);
        
        const data = await apolloClient.query<Types.JobsiteFullQuery>({ ...options, query: Operations.JobsiteFullDocument });
        
        const apolloState = apolloClient.cache.extract();

        return {
            props: {
                apolloState: apolloState,
                data: data?.data,
                error: data?.error ?? data?.errors ?? null,
            },
        };
      }
export const useJobsiteFull = (
  optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.JobsiteFullQuery, Types.JobsiteFullQueryVariables>) => {
  const router = useRouter();
  const options = optionsFunc ? optionsFunc(router) : {};
  return useQuery(Operations.JobsiteFullDocument, options);
};
export type PageJobsiteFullComp = React.FC<{data?: Types.JobsiteFullQuery, error?: Apollo.ApolloError}>;
export const withPageJobsiteFull = (optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.JobsiteFullQuery, Types.JobsiteFullQueryVariables>) => (WrappedComponent:PageJobsiteFullComp) : NextPage  => (props) => {
                const router = useRouter()
                const options = optionsFunc ? optionsFunc(router) : {};
                const {data, error } = useQuery(Operations.JobsiteFullDocument, options)    
                return <WrappedComponent {...props} data={data} error={error} /> ;
                   
            }; 
export const ssrJobsiteFull = {
      getServerPage: getServerPageJobsiteFull,
      withPage: withPageJobsiteFull,
      usePage: useJobsiteFull,
    }
export async function getServerPageJobsitesMaterials
    (options: Omit<Apollo.QueryOptions<Types.JobsitesMaterialsQueryVariables>, 'query'>, ctx: ApolloClientContext ){
        const apolloClient = getApolloClient(ctx);
        
        const data = await apolloClient.query<Types.JobsitesMaterialsQuery>({ ...options, query: Operations.JobsitesMaterialsDocument });
        
        const apolloState = apolloClient.cache.extract();

        return {
            props: {
                apolloState: apolloState,
                data: data?.data,
                error: data?.error ?? data?.errors ?? null,
            },
        };
      }
export const useJobsitesMaterials = (
  optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.JobsitesMaterialsQuery, Types.JobsitesMaterialsQueryVariables>) => {
  const router = useRouter();
  const options = optionsFunc ? optionsFunc(router) : {};
  return useQuery(Operations.JobsitesMaterialsDocument, options);
};
export type PageJobsitesMaterialsComp = React.FC<{data?: Types.JobsitesMaterialsQuery, error?: Apollo.ApolloError}>;
export const withPageJobsitesMaterials = (optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.JobsitesMaterialsQuery, Types.JobsitesMaterialsQueryVariables>) => (WrappedComponent:PageJobsitesMaterialsComp) : NextPage  => (props) => {
                const router = useRouter()
                const options = optionsFunc ? optionsFunc(router) : {};
                const {data, error } = useQuery(Operations.JobsitesMaterialsDocument, options)    
                return <WrappedComponent {...props} data={data} error={error} /> ;
                   
            }; 
export const ssrJobsitesMaterials = {
      getServerPage: getServerPageJobsitesMaterials,
      withPage: withPageJobsitesMaterials,
      usePage: useJobsitesMaterials,
    }
export async function getServerPageJobsitesNonCostedMaterials
    (options: Omit<Apollo.QueryOptions<Types.JobsitesNonCostedMaterialsQueryVariables>, 'query'>, ctx: ApolloClientContext ){
        const apolloClient = getApolloClient(ctx);
        
        const data = await apolloClient.query<Types.JobsitesNonCostedMaterialsQuery>({ ...options, query: Operations.JobsitesNonCostedMaterialsDocument });
        
        const apolloState = apolloClient.cache.extract();

        return {
            props: {
                apolloState: apolloState,
                data: data?.data,
                error: data?.error ?? data?.errors ?? null,
            },
        };
      }
export const useJobsitesNonCostedMaterials = (
  optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.JobsitesNonCostedMaterialsQuery, Types.JobsitesNonCostedMaterialsQueryVariables>) => {
  const router = useRouter();
  const options = optionsFunc ? optionsFunc(router) : {};
  return useQuery(Operations.JobsitesNonCostedMaterialsDocument, options);
};
export type PageJobsitesNonCostedMaterialsComp = React.FC<{data?: Types.JobsitesNonCostedMaterialsQuery, error?: Apollo.ApolloError}>;
export const withPageJobsitesNonCostedMaterials = (optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.JobsitesNonCostedMaterialsQuery, Types.JobsitesNonCostedMaterialsQueryVariables>) => (WrappedComponent:PageJobsitesNonCostedMaterialsComp) : NextPage  => (props) => {
                const router = useRouter()
                const options = optionsFunc ? optionsFunc(router) : {};
                const {data, error } = useQuery(Operations.JobsitesNonCostedMaterialsDocument, options)    
                return <WrappedComponent {...props} data={data} error={error} /> ;
                   
            }; 
export const ssrJobsitesNonCostedMaterials = {
      getServerPage: getServerPageJobsitesNonCostedMaterials,
      withPage: withPageJobsitesNonCostedMaterials,
      usePage: useJobsitesNonCostedMaterials,
    }
export async function getServerPageJobsiteSsr
    (options: Omit<Apollo.QueryOptions<Types.JobsiteSsrQueryVariables>, 'query'>, ctx: ApolloClientContext ){
        const apolloClient = getApolloClient(ctx);
        
        const data = await apolloClient.query<Types.JobsiteSsrQuery>({ ...options, query: Operations.JobsiteSsrDocument });
        
        const apolloState = apolloClient.cache.extract();

        return {
            props: {
                apolloState: apolloState,
                data: data?.data,
                error: data?.error ?? data?.errors ?? null,
            },
        };
      }
export const useJobsiteSsr = (
  optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.JobsiteSsrQuery, Types.JobsiteSsrQueryVariables>) => {
  const router = useRouter();
  const options = optionsFunc ? optionsFunc(router) : {};
  return useQuery(Operations.JobsiteSsrDocument, options);
};
export type PageJobsiteSsrComp = React.FC<{data?: Types.JobsiteSsrQuery, error?: Apollo.ApolloError}>;
export const withPageJobsiteSsr = (optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.JobsiteSsrQuery, Types.JobsiteSsrQueryVariables>) => (WrappedComponent:PageJobsiteSsrComp) : NextPage  => (props) => {
                const router = useRouter()
                const options = optionsFunc ? optionsFunc(router) : {};
                const {data, error } = useQuery(Operations.JobsiteSsrDocument, options)    
                return <WrappedComponent {...props} data={data} error={error} /> ;
                   
            }; 
export const ssrJobsiteSsr = {
      getServerPage: getServerPageJobsiteSsr,
      withPage: withPageJobsiteSsr,
      usePage: useJobsiteSsr,
    }
export async function getServerPageJobsiteFetchSearch
    (options: Omit<Apollo.QueryOptions<Types.JobsiteFetchSearchQueryVariables>, 'query'>, ctx: ApolloClientContext ){
        const apolloClient = getApolloClient(ctx);
        
        const data = await apolloClient.query<Types.JobsiteFetchSearchQuery>({ ...options, query: Operations.JobsiteFetchSearchDocument });
        
        const apolloState = apolloClient.cache.extract();

        return {
            props: {
                apolloState: apolloState,
                data: data?.data,
                error: data?.error ?? data?.errors ?? null,
            },
        };
      }
export const useJobsiteFetchSearch = (
  optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.JobsiteFetchSearchQuery, Types.JobsiteFetchSearchQueryVariables>) => {
  const router = useRouter();
  const options = optionsFunc ? optionsFunc(router) : {};
  return useQuery(Operations.JobsiteFetchSearchDocument, options);
};
export type PageJobsiteFetchSearchComp = React.FC<{data?: Types.JobsiteFetchSearchQuery, error?: Apollo.ApolloError}>;
export const withPageJobsiteFetchSearch = (optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.JobsiteFetchSearchQuery, Types.JobsiteFetchSearchQueryVariables>) => (WrappedComponent:PageJobsiteFetchSearchComp) : NextPage  => (props) => {
                const router = useRouter()
                const options = optionsFunc ? optionsFunc(router) : {};
                const {data, error } = useQuery(Operations.JobsiteFetchSearchDocument, options)    
                return <WrappedComponent {...props} data={data} error={error} /> ;
                   
            }; 
export const ssrJobsiteFetchSearch = {
      getServerPage: getServerPageJobsiteFetchSearch,
      withPage: withPageJobsiteFetchSearch,
      usePage: useJobsiteFetchSearch,
    }
export async function getServerPageJobsites
    (options: Omit<Apollo.QueryOptions<Types.JobsitesQueryVariables>, 'query'>, ctx: ApolloClientContext ){
        const apolloClient = getApolloClient(ctx);
        
        const data = await apolloClient.query<Types.JobsitesQuery>({ ...options, query: Operations.JobsitesDocument });
        
        const apolloState = apolloClient.cache.extract();

        return {
            props: {
                apolloState: apolloState,
                data: data?.data,
                error: data?.error ?? data?.errors ?? null,
            },
        };
      }
export const useJobsites = (
  optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.JobsitesQuery, Types.JobsitesQueryVariables>) => {
  const router = useRouter();
  const options = optionsFunc ? optionsFunc(router) : {};
  return useQuery(Operations.JobsitesDocument, options);
};
export type PageJobsitesComp = React.FC<{data?: Types.JobsitesQuery, error?: Apollo.ApolloError}>;
export const withPageJobsites = (optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.JobsitesQuery, Types.JobsitesQueryVariables>) => (WrappedComponent:PageJobsitesComp) : NextPage  => (props) => {
                const router = useRouter()
                const options = optionsFunc ? optionsFunc(router) : {};
                const {data, error } = useQuery(Operations.JobsitesDocument, options)    
                return <WrappedComponent {...props} data={data} error={error} /> ;
                   
            }; 
export const ssrJobsites = {
      getServerPage: getServerPageJobsites,
      withPage: withPageJobsites,
      usePage: useJobsites,
    }
export async function getServerPageJobsitesTruckingRate
    (options: Omit<Apollo.QueryOptions<Types.JobsitesTruckingRateQueryVariables>, 'query'>, ctx: ApolloClientContext ){
        const apolloClient = getApolloClient(ctx);
        
        const data = await apolloClient.query<Types.JobsitesTruckingRateQuery>({ ...options, query: Operations.JobsitesTruckingRateDocument });
        
        const apolloState = apolloClient.cache.extract();

        return {
            props: {
                apolloState: apolloState,
                data: data?.data,
                error: data?.error ?? data?.errors ?? null,
            },
        };
      }
export const useJobsitesTruckingRate = (
  optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.JobsitesTruckingRateQuery, Types.JobsitesTruckingRateQueryVariables>) => {
  const router = useRouter();
  const options = optionsFunc ? optionsFunc(router) : {};
  return useQuery(Operations.JobsitesTruckingRateDocument, options);
};
export type PageJobsitesTruckingRateComp = React.FC<{data?: Types.JobsitesTruckingRateQuery, error?: Apollo.ApolloError}>;
export const withPageJobsitesTruckingRate = (optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.JobsitesTruckingRateQuery, Types.JobsitesTruckingRateQueryVariables>) => (WrappedComponent:PageJobsitesTruckingRateComp) : NextPage  => (props) => {
                const router = useRouter()
                const options = optionsFunc ? optionsFunc(router) : {};
                const {data, error } = useQuery(Operations.JobsitesTruckingRateDocument, options)    
                return <WrappedComponent {...props} data={data} error={error} /> ;
                   
            }; 
export const ssrJobsitesTruckingRate = {
      getServerPage: getServerPageJobsitesTruckingRate,
      withPage: withPageJobsitesTruckingRate,
      usePage: useJobsitesTruckingRate,
    }
export async function getServerPageMaterialSearch
    (options: Omit<Apollo.QueryOptions<Types.MaterialSearchQueryVariables>, 'query'>, ctx: ApolloClientContext ){
        const apolloClient = getApolloClient(ctx);
        
        const data = await apolloClient.query<Types.MaterialSearchQuery>({ ...options, query: Operations.MaterialSearchDocument });
        
        const apolloState = apolloClient.cache.extract();

        return {
            props: {
                apolloState: apolloState,
                data: data?.data,
                error: data?.error ?? data?.errors ?? null,
            },
        };
      }
export const useMaterialSearch = (
  optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.MaterialSearchQuery, Types.MaterialSearchQueryVariables>) => {
  const router = useRouter();
  const options = optionsFunc ? optionsFunc(router) : {};
  return useQuery(Operations.MaterialSearchDocument, options);
};
export type PageMaterialSearchComp = React.FC<{data?: Types.MaterialSearchQuery, error?: Apollo.ApolloError}>;
export const withPageMaterialSearch = (optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.MaterialSearchQuery, Types.MaterialSearchQueryVariables>) => (WrappedComponent:PageMaterialSearchComp) : NextPage  => (props) => {
                const router = useRouter()
                const options = optionsFunc ? optionsFunc(router) : {};
                const {data, error } = useQuery(Operations.MaterialSearchDocument, options)    
                return <WrappedComponent {...props} data={data} error={error} /> ;
                   
            }; 
export const ssrMaterialSearch = {
      getServerPage: getServerPageMaterialSearch,
      withPage: withPageMaterialSearch,
      usePage: useMaterialSearch,
    }
export async function getServerPageMaterialCard
    (options: Omit<Apollo.QueryOptions<Types.MaterialCardQueryVariables>, 'query'>, ctx: ApolloClientContext ){
        const apolloClient = getApolloClient(ctx);
        
        const data = await apolloClient.query<Types.MaterialCardQuery>({ ...options, query: Operations.MaterialCardDocument });
        
        const apolloState = apolloClient.cache.extract();

        return {
            props: {
                apolloState: apolloState,
                data: data?.data,
                error: data?.error ?? data?.errors ?? null,
            },
        };
      }
export const useMaterialCard = (
  optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.MaterialCardQuery, Types.MaterialCardQueryVariables>) => {
  const router = useRouter();
  const options = optionsFunc ? optionsFunc(router) : {};
  return useQuery(Operations.MaterialCardDocument, options);
};
export type PageMaterialCardComp = React.FC<{data?: Types.MaterialCardQuery, error?: Apollo.ApolloError}>;
export const withPageMaterialCard = (optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.MaterialCardQuery, Types.MaterialCardQueryVariables>) => (WrappedComponent:PageMaterialCardComp) : NextPage  => (props) => {
                const router = useRouter()
                const options = optionsFunc ? optionsFunc(router) : {};
                const {data, error } = useQuery(Operations.MaterialCardDocument, options)    
                return <WrappedComponent {...props} data={data} error={error} /> ;
                   
            }; 
export const ssrMaterialCard = {
      getServerPage: getServerPageMaterialCard,
      withPage: withPageMaterialCard,
      usePage: useMaterialCard,
    }
export async function getServerPageMaterialsCard
    (options: Omit<Apollo.QueryOptions<Types.MaterialsCardQueryVariables>, 'query'>, ctx: ApolloClientContext ){
        const apolloClient = getApolloClient(ctx);
        
        const data = await apolloClient.query<Types.MaterialsCardQuery>({ ...options, query: Operations.MaterialsCardDocument });
        
        const apolloState = apolloClient.cache.extract();

        return {
            props: {
                apolloState: apolloState,
                data: data?.data,
                error: data?.error ?? data?.errors ?? null,
            },
        };
      }
export const useMaterialsCard = (
  optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.MaterialsCardQuery, Types.MaterialsCardQueryVariables>) => {
  const router = useRouter();
  const options = optionsFunc ? optionsFunc(router) : {};
  return useQuery(Operations.MaterialsCardDocument, options);
};
export type PageMaterialsCardComp = React.FC<{data?: Types.MaterialsCardQuery, error?: Apollo.ApolloError}>;
export const withPageMaterialsCard = (optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.MaterialsCardQuery, Types.MaterialsCardQueryVariables>) => (WrappedComponent:PageMaterialsCardComp) : NextPage  => (props) => {
                const router = useRouter()
                const options = optionsFunc ? optionsFunc(router) : {};
                const {data, error } = useQuery(Operations.MaterialsCardDocument, options)    
                return <WrappedComponent {...props} data={data} error={error} /> ;
                   
            }; 
export const ssrMaterialsCard = {
      getServerPage: getServerPageMaterialsCard,
      withPage: withPageMaterialsCard,
      usePage: useMaterialsCard,
    }
export async function getServerPageMaterialsFull
    (options: Omit<Apollo.QueryOptions<Types.MaterialsFullQueryVariables>, 'query'>, ctx: ApolloClientContext ){
        const apolloClient = getApolloClient(ctx);
        
        const data = await apolloClient.query<Types.MaterialsFullQuery>({ ...options, query: Operations.MaterialsFullDocument });
        
        const apolloState = apolloClient.cache.extract();

        return {
            props: {
                apolloState: apolloState,
                data: data?.data,
                error: data?.error ?? data?.errors ?? null,
            },
        };
      }
export const useMaterialsFull = (
  optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.MaterialsFullQuery, Types.MaterialsFullQueryVariables>) => {
  const router = useRouter();
  const options = optionsFunc ? optionsFunc(router) : {};
  return useQuery(Operations.MaterialsFullDocument, options);
};
export type PageMaterialsFullComp = React.FC<{data?: Types.MaterialsFullQuery, error?: Apollo.ApolloError}>;
export const withPageMaterialsFull = (optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.MaterialsFullQuery, Types.MaterialsFullQueryVariables>) => (WrappedComponent:PageMaterialsFullComp) : NextPage  => (props) => {
                const router = useRouter()
                const options = optionsFunc ? optionsFunc(router) : {};
                const {data, error } = useQuery(Operations.MaterialsFullDocument, options)    
                return <WrappedComponent {...props} data={data} error={error} /> ;
                   
            }; 
export const ssrMaterialsFull = {
      getServerPage: getServerPageMaterialsFull,
      withPage: withPageMaterialsFull,
      usePage: useMaterialsFull,
    }
export async function getServerPageSearch
    (options: Omit<Apollo.QueryOptions<Types.SearchQueryVariables>, 'query'>, ctx: ApolloClientContext ){
        const apolloClient = getApolloClient(ctx);
        
        const data = await apolloClient.query<Types.SearchQuery>({ ...options, query: Operations.SearchDocument });
        
        const apolloState = apolloClient.cache.extract();

        return {
            props: {
                apolloState: apolloState,
                data: data?.data,
                error: data?.error ?? data?.errors ?? null,
            },
        };
      }
export const useSearch = (
  optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.SearchQuery, Types.SearchQueryVariables>) => {
  const router = useRouter();
  const options = optionsFunc ? optionsFunc(router) : {};
  return useQuery(Operations.SearchDocument, options);
};
export type PageSearchComp = React.FC<{data?: Types.SearchQuery, error?: Apollo.ApolloError}>;
export const withPageSearch = (optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.SearchQuery, Types.SearchQueryVariables>) => (WrappedComponent:PageSearchComp) : NextPage  => (props) => {
                const router = useRouter()
                const options = optionsFunc ? optionsFunc(router) : {};
                const {data, error } = useQuery(Operations.SearchDocument, options)    
                return <WrappedComponent {...props} data={data} error={error} /> ;
                   
            }; 
export const ssrSearch = {
      getServerPage: getServerPageSearch,
      withPage: withPageSearch,
      usePage: useSearch,
    }
export async function getServerPageSignupSsr
    (options: Omit<Apollo.QueryOptions<Types.SignupSsrQueryVariables>, 'query'>, ctx: ApolloClientContext ){
        const apolloClient = getApolloClient(ctx);
        
        const data = await apolloClient.query<Types.SignupSsrQuery>({ ...options, query: Operations.SignupSsrDocument });
        
        const apolloState = apolloClient.cache.extract();

        return {
            props: {
                apolloState: apolloState,
                data: data?.data,
                error: data?.error ?? data?.errors ?? null,
            },
        };
      }
export const useSignupSsr = (
  optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.SignupSsrQuery, Types.SignupSsrQueryVariables>) => {
  const router = useRouter();
  const options = optionsFunc ? optionsFunc(router) : {};
  return useQuery(Operations.SignupSsrDocument, options);
};
export type PageSignupSsrComp = React.FC<{data?: Types.SignupSsrQuery, error?: Apollo.ApolloError}>;
export const withPageSignupSsr = (optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.SignupSsrQuery, Types.SignupSsrQueryVariables>) => (WrappedComponent:PageSignupSsrComp) : NextPage  => (props) => {
                const router = useRouter()
                const options = optionsFunc ? optionsFunc(router) : {};
                const {data, error } = useQuery(Operations.SignupSsrDocument, options)    
                return <WrappedComponent {...props} data={data} error={error} /> ;
                   
            }; 
export const ssrSignupSsr = {
      getServerPage: getServerPageSignupSsr,
      withPage: withPageSignupSsr,
      usePage: useSignupSsr,
    }
export async function getServerPageSystem
    (options: Omit<Apollo.QueryOptions<Types.SystemQueryVariables>, 'query'>, ctx: ApolloClientContext ){
        const apolloClient = getApolloClient(ctx);
        
        const data = await apolloClient.query<Types.SystemQuery>({ ...options, query: Operations.SystemDocument });
        
        const apolloState = apolloClient.cache.extract();

        return {
            props: {
                apolloState: apolloState,
                data: data?.data,
                error: data?.error ?? data?.errors ?? null,
            },
        };
      }
export const useSystem = (
  optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.SystemQuery, Types.SystemQueryVariables>) => {
  const router = useRouter();
  const options = optionsFunc ? optionsFunc(router) : {};
  return useQuery(Operations.SystemDocument, options);
};
export type PageSystemComp = React.FC<{data?: Types.SystemQuery, error?: Apollo.ApolloError}>;
export const withPageSystem = (optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.SystemQuery, Types.SystemQueryVariables>) => (WrappedComponent:PageSystemComp) : NextPage  => (props) => {
                const router = useRouter()
                const options = optionsFunc ? optionsFunc(router) : {};
                const {data, error } = useQuery(Operations.SystemDocument, options)    
                return <WrappedComponent {...props} data={data} error={error} /> ;
                   
            }; 
export const ssrSystem = {
      getServerPage: getServerPageSystem,
      withPage: withPageSystem,
      usePage: useSystem,
    }
export async function getServerPageUserForPasswordReset
    (options: Omit<Apollo.QueryOptions<Types.UserForPasswordResetQueryVariables>, 'query'>, ctx: ApolloClientContext ){
        const apolloClient = getApolloClient(ctx);
        
        const data = await apolloClient.query<Types.UserForPasswordResetQuery>({ ...options, query: Operations.UserForPasswordResetDocument });
        
        const apolloState = apolloClient.cache.extract();

        return {
            props: {
                apolloState: apolloState,
                data: data?.data,
                error: data?.error ?? data?.errors ?? null,
            },
        };
      }
export const useUserForPasswordReset = (
  optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.UserForPasswordResetQuery, Types.UserForPasswordResetQueryVariables>) => {
  const router = useRouter();
  const options = optionsFunc ? optionsFunc(router) : {};
  return useQuery(Operations.UserForPasswordResetDocument, options);
};
export type PageUserForPasswordResetComp = React.FC<{data?: Types.UserForPasswordResetQuery, error?: Apollo.ApolloError}>;
export const withPageUserForPasswordReset = (optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.UserForPasswordResetQuery, Types.UserForPasswordResetQueryVariables>) => (WrappedComponent:PageUserForPasswordResetComp) : NextPage  => (props) => {
                const router = useRouter()
                const options = optionsFunc ? optionsFunc(router) : {};
                const {data, error } = useQuery(Operations.UserForPasswordResetDocument, options)    
                return <WrappedComponent {...props} data={data} error={error} /> ;
                   
            }; 
export const ssrUserForPasswordReset = {
      getServerPage: getServerPageUserForPasswordReset,
      withPage: withPageUserForPasswordReset,
      usePage: useUserForPasswordReset,
    }
export async function getServerPageUsers
    (options: Omit<Apollo.QueryOptions<Types.UsersQueryVariables>, 'query'>, ctx: ApolloClientContext ){
        const apolloClient = getApolloClient(ctx);
        
        const data = await apolloClient.query<Types.UsersQuery>({ ...options, query: Operations.UsersDocument });
        
        const apolloState = apolloClient.cache.extract();

        return {
            props: {
                apolloState: apolloState,
                data: data?.data,
                error: data?.error ?? data?.errors ?? null,
            },
        };
      }
export const useUsers = (
  optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.UsersQuery, Types.UsersQueryVariables>) => {
  const router = useRouter();
  const options = optionsFunc ? optionsFunc(router) : {};
  return useQuery(Operations.UsersDocument, options);
};
export type PageUsersComp = React.FC<{data?: Types.UsersQuery, error?: Apollo.ApolloError}>;
export const withPageUsers = (optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.UsersQuery, Types.UsersQueryVariables>) => (WrappedComponent:PageUsersComp) : NextPage  => (props) => {
                const router = useRouter()
                const options = optionsFunc ? optionsFunc(router) : {};
                const {data, error } = useQuery(Operations.UsersDocument, options)    
                return <WrappedComponent {...props} data={data} error={error} /> ;
                   
            }; 
export const ssrUsers = {
      getServerPage: getServerPageUsers,
      withPage: withPageUsers,
      usePage: useUsers,
    }
export async function getServerPageVehicleSearch
    (options: Omit<Apollo.QueryOptions<Types.VehicleSearchQueryVariables>, 'query'>, ctx: ApolloClientContext ){
        const apolloClient = getApolloClient(ctx);
        
        const data = await apolloClient.query<Types.VehicleSearchQuery>({ ...options, query: Operations.VehicleSearchDocument });
        
        const apolloState = apolloClient.cache.extract();

        return {
            props: {
                apolloState: apolloState,
                data: data?.data,
                error: data?.error ?? data?.errors ?? null,
            },
        };
      }
export const useVehicleSearch = (
  optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.VehicleSearchQuery, Types.VehicleSearchQueryVariables>) => {
  const router = useRouter();
  const options = optionsFunc ? optionsFunc(router) : {};
  return useQuery(Operations.VehicleSearchDocument, options);
};
export type PageVehicleSearchComp = React.FC<{data?: Types.VehicleSearchQuery, error?: Apollo.ApolloError}>;
export const withPageVehicleSearch = (optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.VehicleSearchQuery, Types.VehicleSearchQueryVariables>) => (WrappedComponent:PageVehicleSearchComp) : NextPage  => (props) => {
                const router = useRouter()
                const options = optionsFunc ? optionsFunc(router) : {};
                const {data, error } = useQuery(Operations.VehicleSearchDocument, options)    
                return <WrappedComponent {...props} data={data} error={error} /> ;
                   
            }; 
export const ssrVehicleSearch = {
      getServerPage: getServerPageVehicleSearch,
      withPage: withPageVehicleSearch,
      usePage: useVehicleSearch,
    }
export async function getServerPageVehicleFull
    (options: Omit<Apollo.QueryOptions<Types.VehicleFullQueryVariables>, 'query'>, ctx: ApolloClientContext ){
        const apolloClient = getApolloClient(ctx);
        
        const data = await apolloClient.query<Types.VehicleFullQuery>({ ...options, query: Operations.VehicleFullDocument });
        
        const apolloState = apolloClient.cache.extract();

        return {
            props: {
                apolloState: apolloState,
                data: data?.data,
                error: data?.error ?? data?.errors ?? null,
            },
        };
      }
export const useVehicleFull = (
  optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.VehicleFullQuery, Types.VehicleFullQueryVariables>) => {
  const router = useRouter();
  const options = optionsFunc ? optionsFunc(router) : {};
  return useQuery(Operations.VehicleFullDocument, options);
};
export type PageVehicleFullComp = React.FC<{data?: Types.VehicleFullQuery, error?: Apollo.ApolloError}>;
export const withPageVehicleFull = (optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.VehicleFullQuery, Types.VehicleFullQueryVariables>) => (WrappedComponent:PageVehicleFullComp) : NextPage  => (props) => {
                const router = useRouter()
                const options = optionsFunc ? optionsFunc(router) : {};
                const {data, error } = useQuery(Operations.VehicleFullDocument, options)    
                return <WrappedComponent {...props} data={data} error={error} /> ;
                   
            }; 
export const ssrVehicleFull = {
      getServerPage: getServerPageVehicleFull,
      withPage: withPageVehicleFull,
      usePage: useVehicleFull,
    }
export async function getServerPageVehicleSsr
    (options: Omit<Apollo.QueryOptions<Types.VehicleSsrQueryVariables>, 'query'>, ctx: ApolloClientContext ){
        const apolloClient = getApolloClient(ctx);
        
        const data = await apolloClient.query<Types.VehicleSsrQuery>({ ...options, query: Operations.VehicleSsrDocument });
        
        const apolloState = apolloClient.cache.extract();

        return {
            props: {
                apolloState: apolloState,
                data: data?.data,
                error: data?.error ?? data?.errors ?? null,
            },
        };
      }
export const useVehicleSsr = (
  optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.VehicleSsrQuery, Types.VehicleSsrQueryVariables>) => {
  const router = useRouter();
  const options = optionsFunc ? optionsFunc(router) : {};
  return useQuery(Operations.VehicleSsrDocument, options);
};
export type PageVehicleSsrComp = React.FC<{data?: Types.VehicleSsrQuery, error?: Apollo.ApolloError}>;
export const withPageVehicleSsr = (optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.VehicleSsrQuery, Types.VehicleSsrQueryVariables>) => (WrappedComponent:PageVehicleSsrComp) : NextPage  => (props) => {
                const router = useRouter()
                const options = optionsFunc ? optionsFunc(router) : {};
                const {data, error } = useQuery(Operations.VehicleSsrDocument, options)    
                return <WrappedComponent {...props} data={data} error={error} /> ;
                   
            }; 
export const ssrVehicleSsr = {
      getServerPage: getServerPageVehicleSsr,
      withPage: withPageVehicleSsr,
      usePage: useVehicleSsr,
    }
export async function getServerPageVehicleFetchSearch
    (options: Omit<Apollo.QueryOptions<Types.VehicleFetchSearchQueryVariables>, 'query'>, ctx: ApolloClientContext ){
        const apolloClient = getApolloClient(ctx);
        
        const data = await apolloClient.query<Types.VehicleFetchSearchQuery>({ ...options, query: Operations.VehicleFetchSearchDocument });
        
        const apolloState = apolloClient.cache.extract();

        return {
            props: {
                apolloState: apolloState,
                data: data?.data,
                error: data?.error ?? data?.errors ?? null,
            },
        };
      }
export const useVehicleFetchSearch = (
  optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.VehicleFetchSearchQuery, Types.VehicleFetchSearchQueryVariables>) => {
  const router = useRouter();
  const options = optionsFunc ? optionsFunc(router) : {};
  return useQuery(Operations.VehicleFetchSearchDocument, options);
};
export type PageVehicleFetchSearchComp = React.FC<{data?: Types.VehicleFetchSearchQuery, error?: Apollo.ApolloError}>;
export const withPageVehicleFetchSearch = (optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.VehicleFetchSearchQuery, Types.VehicleFetchSearchQueryVariables>) => (WrappedComponent:PageVehicleFetchSearchComp) : NextPage  => (props) => {
                const router = useRouter()
                const options = optionsFunc ? optionsFunc(router) : {};
                const {data, error } = useQuery(Operations.VehicleFetchSearchDocument, options)    
                return <WrappedComponent {...props} data={data} error={error} /> ;
                   
            }; 
export const ssrVehicleFetchSearch = {
      getServerPage: getServerPageVehicleFetchSearch,
      withPage: withPageVehicleFetchSearch,
      usePage: useVehicleFetchSearch,
    }
export async function getServerPageJobsiteMonthReportSub
    (options: Omit<Apollo.QueryOptions<Types.JobsiteMonthReportSubSubscriptionVariables>, 'query'>, ctx: ApolloClientContext ){
        const apolloClient = getApolloClient(ctx);
        
        const data = await apolloClient.query<Types.JobsiteMonthReportSubSubscription>({ ...options, query: Operations.JobsiteMonthReportSubDocument });
        
        const apolloState = apolloClient.cache.extract();

        return {
            props: {
                apolloState: apolloState,
                data: data?.data,
                error: data?.error ?? data?.errors ?? null,
            },
        };
      }
export const useJobsiteMonthReportSub = (
  optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.JobsiteMonthReportSubSubscription, Types.JobsiteMonthReportSubSubscriptionVariables>) => {
  const router = useRouter();
  const options = optionsFunc ? optionsFunc(router) : {};
  return useQuery(Operations.JobsiteMonthReportSubDocument, options);
};
export type PageJobsiteMonthReportSubComp = React.FC<{data?: Types.JobsiteMonthReportSubSubscription, error?: Apollo.ApolloError}>;
export const withPageJobsiteMonthReportSub = (optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.JobsiteMonthReportSubSubscription, Types.JobsiteMonthReportSubSubscriptionVariables>) => (WrappedComponent:PageJobsiteMonthReportSubComp) : NextPage  => (props) => {
                const router = useRouter()
                const options = optionsFunc ? optionsFunc(router) : {};
                const {data, error } = useQuery(Operations.JobsiteMonthReportSubDocument, options)    
                return <WrappedComponent {...props} data={data} error={error} /> ;
                   
            }; 
export const ssrJobsiteMonthReportSub = {
      getServerPage: getServerPageJobsiteMonthReportSub,
      withPage: withPageJobsiteMonthReportSub,
      usePage: useJobsiteMonthReportSub,
    }
export async function getServerPageJobsiteYearMasterReportSub
    (options: Omit<Apollo.QueryOptions<Types.JobsiteYearMasterReportSubSubscriptionVariables>, 'query'>, ctx: ApolloClientContext ){
        const apolloClient = getApolloClient(ctx);
        
        const data = await apolloClient.query<Types.JobsiteYearMasterReportSubSubscription>({ ...options, query: Operations.JobsiteYearMasterReportSubDocument });
        
        const apolloState = apolloClient.cache.extract();

        return {
            props: {
                apolloState: apolloState,
                data: data?.data,
                error: data?.error ?? data?.errors ?? null,
            },
        };
      }
export const useJobsiteYearMasterReportSub = (
  optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.JobsiteYearMasterReportSubSubscription, Types.JobsiteYearMasterReportSubSubscriptionVariables>) => {
  const router = useRouter();
  const options = optionsFunc ? optionsFunc(router) : {};
  return useQuery(Operations.JobsiteYearMasterReportSubDocument, options);
};
export type PageJobsiteYearMasterReportSubComp = React.FC<{data?: Types.JobsiteYearMasterReportSubSubscription, error?: Apollo.ApolloError}>;
export const withPageJobsiteYearMasterReportSub = (optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.JobsiteYearMasterReportSubSubscription, Types.JobsiteYearMasterReportSubSubscriptionVariables>) => (WrappedComponent:PageJobsiteYearMasterReportSubComp) : NextPage  => (props) => {
                const router = useRouter()
                const options = optionsFunc ? optionsFunc(router) : {};
                const {data, error } = useQuery(Operations.JobsiteYearMasterReportSubDocument, options)    
                return <WrappedComponent {...props} data={data} error={error} /> ;
                   
            }; 
export const ssrJobsiteYearMasterReportSub = {
      getServerPage: getServerPageJobsiteYearMasterReportSub,
      withPage: withPageJobsiteYearMasterReportSub,
      usePage: useJobsiteYearMasterReportSub,
    }
export async function getServerPageJobsiteYearReportSub
    (options: Omit<Apollo.QueryOptions<Types.JobsiteYearReportSubSubscriptionVariables>, 'query'>, ctx: ApolloClientContext ){
        const apolloClient = getApolloClient(ctx);
        
        const data = await apolloClient.query<Types.JobsiteYearReportSubSubscription>({ ...options, query: Operations.JobsiteYearReportSubDocument });
        
        const apolloState = apolloClient.cache.extract();

        return {
            props: {
                apolloState: apolloState,
                data: data?.data,
                error: data?.error ?? data?.errors ?? null,
            },
        };
      }
export const useJobsiteYearReportSub = (
  optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.JobsiteYearReportSubSubscription, Types.JobsiteYearReportSubSubscriptionVariables>) => {
  const router = useRouter();
  const options = optionsFunc ? optionsFunc(router) : {};
  return useQuery(Operations.JobsiteYearReportSubDocument, options);
};
export type PageJobsiteYearReportSubComp = React.FC<{data?: Types.JobsiteYearReportSubSubscription, error?: Apollo.ApolloError}>;
export const withPageJobsiteYearReportSub = (optionsFunc?: (router: NextRouter)=> QueryHookOptions<Types.JobsiteYearReportSubSubscription, Types.JobsiteYearReportSubSubscriptionVariables>) => (WrappedComponent:PageJobsiteYearReportSubComp) : NextPage  => (props) => {
                const router = useRouter()
                const options = optionsFunc ? optionsFunc(router) : {};
                const {data, error } = useQuery(Operations.JobsiteYearReportSubDocument, options)    
                return <WrappedComponent {...props} data={data} error={error} /> ;
                   
            }; 
export const ssrJobsiteYearReportSub = {
      getServerPage: getServerPageJobsiteYearReportSub,
      withPage: withPageJobsiteYearReportSub,
      usePage: useJobsiteYearReportSub,
    }