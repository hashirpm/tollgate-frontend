import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type EndpointInput, type EndpointStatus } from "@/lib/api";

export function useEndpoints() {
  return useQuery({ queryKey: ["endpoints"], queryFn: api.endpoints, refetchInterval: 10_000 });
}

export function useEndpoint(id: string | undefined) {
  return useQuery({
    queryKey: ["endpoint", id],
    queryFn: () => api.endpoint(id!),
    enabled: !!id,
    refetchInterval: 10_000,
  });
}

function useInvalidateEndpoints() {
  const qc = useQueryClient();
  return (id?: string) => {
    qc.invalidateQueries({ queryKey: ["endpoints"] });
    if (id) qc.invalidateQueries({ queryKey: ["endpoint", id] });
    qc.invalidateQueries({ queryKey: ["catalog"] });
  };
}

export function useSaveEndpoint() {
  const invalidate = useInvalidateEndpoints();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: EndpointInput }) =>
      id ? api.updateEndpoint(id, input) : api.createEndpoint(input),
    onSuccess: (ep) => invalidate(ep.id),
  });
}

export function useSetEndpointStatus() {
  const invalidate = useInvalidateEndpoints();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: EndpointStatus }) => api.updateEndpoint(id, { status }),
    onSuccess: (ep) => invalidate(ep.id),
  });
}

export function useDeleteEndpoint() {
  const invalidate = useInvalidateEndpoints();
  return useMutation({
    mutationFn: (id: string) => api.deleteEndpoint(id),
    onSuccess: (_, id) => invalidate(id),
  });
}

export function useTestEndpoint() {
  const invalidate = useInvalidateEndpoints();
  return useMutation({
    mutationFn: (id: string) => api.testEndpoint(id),
    // a passing test flips the endpoint to active server-side
    onSettled: (_, __, id) => invalidate(id),
  });
}

export function useCatalog() {
  return useQuery({ queryKey: ["catalog"], queryFn: api.catalog, refetchInterval: 15_000 });
}
