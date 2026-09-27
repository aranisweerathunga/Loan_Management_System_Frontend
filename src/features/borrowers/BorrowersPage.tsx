import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Button, ButtonLink } from "@/components/Button";
import { DataTable } from "@/components/DataTable";
import { FormField } from "@/components/FormField";
import { Input, Select } from "@/components/Fields";
import { PageHeader, Panel } from "@/components/PageHeader";
import { QueryState } from "@/components/QueryState";
import { ActiveBadge } from "@/components/StatusBadge";
import { usePageMeta } from "@/components/pageMeta";
import { listBorrowers } from "@/lib/api/borrowers";
import { borrowerKeys } from "@/lib/api/keys";
import { displayText, formatDateOnly, fullName } from "@/lib/format";
import { BorrowerFormModal } from "@/features/borrowers/BorrowerFormModal";

export function BorrowersPage() {
  usePageMeta("Borrowers", [{ label: "Borrowers" }]);
  const navigate = useNavigate();
  const borrowers = useQuery({
    queryKey: borrowerKeys.all,
    queryFn: ({ signal }) => listBorrowers(signal),
  });
  const [text, setText] = useState("");
  const [status, setStatus] = useState("all");
  const [creating, setCreating] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    if (pendingId && !creating) navigate(`/borrowers/${pendingId}`);
  }, [creating, navigate, pendingId]);

  const rows = useMemo(() => {
    const needle = text.trim().toLowerCase();
    return [...(borrowers.data ?? [])]
      .filter((borrower) => {
        if (status === "active" && !borrower.isActive) return false;
        if (status === "inactive" && borrower.isActive) return false;
        if (!needle) return true;
        return [fullName(borrower), borrower.email, borrower.phone]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(needle);
      })
      .sort(
        (left, right) =>
          left.lastName.localeCompare(right.lastName) ||
          left.firstName.localeCompare(right.firstName),
      );
  }, [borrowers.data, status, text]);

  return (
    <>
      <PageHeader
        title="Borrowers"
        description="People who can be linked to an employee profile. The list is loaded in full; search and pagination are not provided by the API."
        actions={
          <Button type="button" onClick={() => setCreating(true)}>
            Add borrower
          </Button>
        }
      />
      <div className="filters">
        <FormField
          id="borrower-filter"
          label="Filter loaded borrowers"
          hint="Matches name, email, or phone in the loaded list."
        >
          <Input value={text} onChange={(event) => setText(event.target.value)} />
        </FormField>
        <FormField id="borrower-status-filter" className="field--narrow" label="Status">
          <Select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </FormField>
      </div>
      <Panel flush>
        <QueryState
          isLoading={borrowers.isPending}
          isError={borrowers.isError && borrowers.data === undefined}
          error={borrowers.error}
          onRetry={() => void borrowers.refetch()}
          isEmpty={borrowers.isSuccess && borrowers.data.length === 0}
          loadingLabel="Loading borrowers"
          empty={
            <div className="empty-state">
              <h2>No borrowers yet</h2>
              <p>Add a borrower to start a record. An employee profile is optional.</p>
              <Button type="button" onClick={() => setCreating(true)}>
                Add borrower
              </Button>
            </div>
          }
        >
          {rows.length === 0 ? (
            <div className="empty-state">
              <h2>No borrowers match this filter</h2>
              <p>
                Try a different name, email, phone, or status. Filtering does not call the server.
              </p>
            </div>
          ) : (
            <DataTable
              caption="Borrowers"
              rows={rows}
              getRowId={(borrower) => borrower.id}
              columns={[
                {
                  id: "name",
                  header: "Name",
                  cell: (borrower) => (
                    <Link to={`/borrowers/${borrower.id}`}>{fullName(borrower)}</Link>
                  ),
                },
                {
                  id: "dob",
                  header: "Date of birth",
                  cell: (borrower) => formatDateOnly(borrower.dateOfBirth),
                },
                { id: "email", header: "Email", cell: (borrower) => displayText(borrower.email) },
                { id: "phone", header: "Phone", cell: (borrower) => displayText(borrower.phone) },
                {
                  id: "status",
                  header: "Status",
                  cell: (borrower) => <ActiveBadge active={borrower.isActive} />,
                },
                {
                  id: "actions",
                  header: "Actions",
                  align: "end",
                  cell: (borrower) => (
                    <div className="cell-actions">
                      <ButtonLink to={`/borrowers/${borrower.id}`} variant="ghost" size="sm">
                        View
                      </ButtonLink>
                    </div>
                  ),
                },
              ]}
            />
          )}
        </QueryState>
      </Panel>
      {creating ? (
        <BorrowerFormModal onCreated={setPendingId} onClose={() => setCreating(false)} />
      ) : null}
    </>
  );
}
