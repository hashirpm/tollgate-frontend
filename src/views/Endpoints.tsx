"use client";

import { Blocks, Pause, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { CopyUrl } from "@/components/CopyButton";
import { EnsName } from "@/components/Ens";
import { EndpointStatusBadge } from "@/components/StatusBadge";
import { Avatar, EmptyState, ErrorState, PageHeader, Skeleton, Spinner } from "@/components/ui";
import { useDeleteEndpoint, useEndpoints, useSetEndpointStatus } from "@/hooks/useEndpoints";
import { type Endpoint, paidUrl } from "@/lib/api";
import { usdc } from "@/lib/format";

const COLS = "grid-cols-[minmax(190px,1.5fr)_64px_80px_124px_64px_84px_minmax(150px,1fr)_120px]";

export function EndpointsPage() {
  const endpoints = useEndpoints();
  const setStatus = useSetEndpointStatus();
  const del = useDeleteEndpoint();
  const [toDelete, setToDelete] = useState<Endpoint | null>(null);

  const rows = endpoints.data ?? [];

  return (
    <>
      <PageHeader title="Listings" sub="The API credits you’re selling. Only live listings appear in the catalog Claude sees.">
        <Link href="/endpoints/new" className="btn btn-primary">
          <Plus className="size-4" /> List credits
        </Link>
      </PageHeader>

      {(setStatus.error || del.error) && (
        <div className="mb-4">
          <ErrorState error={setStatus.error ?? del.error} />
        </div>
      )}

      <div className="card overflow-hidden">
        {endpoints.isPending ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : endpoints.error ? (
          <div className="p-6">
            <ErrorState error={endpoints.error} onRetry={() => endpoints.refetch()} />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Blocks className="size-5" />}
            title="List your first credits"
            action={
              <Link href="/endpoints/new" className="btn btn-primary">
                <Plus className="size-4" /> List credits
              </Link>
            }
          >
            Connect the API your leftover credits are on, set a price per call, and agents can start buying them.
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[980px] pt-5">
              <div className={`thead-row ${COLS}`}>
                <div>Name</div>
                <div>Method</div>
                <div className="text-right">Price</div>
                <div>Status</div>
                <div className="text-right">Calls</div>
                <div className="text-right">Earned</div>
                <div>Paid URL</div>
                <div className="text-right">Actions</div>
              </div>
              {rows.map((e) => {
                const busy = setStatus.isPending && setStatus.variables?.id === e.id;
                return (
                  <div key={e.id} className={`trow ${COLS}`}>
                    <Link href={`/endpoints/${e.id}`} className="flex min-w-0 items-center gap-3">
                      <Avatar seed={e.id} size={34} />
                      <div className="min-w-0">
                        <div className="truncate font-medium hover:underline">{e.name}</div>
                        {e.ensName ? (
                          <EnsName name={e.ensName} size="sm" link={false} className="mt-0.5" />
                        ) : (
                          <div className="truncate text-xs text-ink-3">{e.description || e.url}</div>
                        )}
                      </div>
                    </Link>
                    <span className="w-fit rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-ink-2">{e.method}</span>
                    <div className="num text-right">{usdc(e.priceAtomic)}</div>
                    <EndpointStatusBadge status={e.status} />
                    <div className="num text-right">{e.calls.toLocaleString()}</div>
                    <div className="num text-right font-medium">{usdc(e.incomeAtomic)}</div>
                    <CopyUrl url={paidUrl(e.id)} label={`/x/${e.id}`} />
                    <div className="flex justify-end gap-1">
                      {e.status === "active" ? (
                        <IconBtn label="Pause" onClick={() => setStatus.mutate({ id: e.id, status: "paused" })} disabled={busy}>
                          {busy ? <Spinner /> : <Pause className="size-4" />}
                        </IconBtn>
                      ) : e.status === "paused" ? (
                        <IconBtn label="Activate" onClick={() => setStatus.mutate({ id: e.id, status: "active" })} disabled={busy}>
                          {busy ? <Spinner /> : <Play className="size-4" />}
                        </IconBtn>
                      ) : (
                        // pending listings go live by passing a test, not by a toggle
                        <Link href={`/endpoints/${e.id}/edit`} className="btn btn-ghost btn-sm" title="Run the test to activate">
                          Test
                        </Link>
                      )}
                      <Link href={`/endpoints/${e.id}/edit`} className="btn btn-ghost size-8 px-0" aria-label="Edit" title="Edit">
                        <Pencil className="size-4" />
                      </Link>
                      <IconBtn label="Delete" onClick={() => setToDelete(e)}>
                        <Trash2 className="size-4 text-bad-text" />
                      </IconBtn>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!toDelete}
        title={`Delete ${toDelete?.name ?? "listing"}?`}
        confirmLabel="Delete"
        danger
        busy={del.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={() => toDelete && del.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })}
      >
        Agents can no longer buy these credits: the paid URL stops working and it leaves the catalog. This can’t be undone.
      </ConfirmDialog>
    </>
  );
}

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button className="btn btn-ghost size-8 px-0" onClick={onClick} disabled={disabled} aria-label={label} title={label}>
      {children}
    </button>
  );
}
