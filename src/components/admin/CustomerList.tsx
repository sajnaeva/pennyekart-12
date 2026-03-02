import { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MapPin } from "lucide-react";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  mobile_number: string | null;
  local_body_id: string | null;
  ward_number: number | null;
  local_body_name?: string | null;
  local_body_type?: string | null;
  district_name?: string | null;
}

interface CustomerListProps {
  customers: Profile[];
}

const CustomerList = ({ customers }: CustomerListProps) => {
  const [filterPanchayath, setFilterPanchayath] = useState("all");
  const [filterWard, setFilterWard] = useState("all");

  // Get unique panchayaths with counts
  const panchayathStats = useMemo(() => {
    const map = new Map<string, { name: string; type: string; count: number }>();
    customers.forEach((c) => {
      const key = c.local_body_id ?? "__none";
      const existing = map.get(key);
      if (existing) {
        existing.count++;
      } else {
        map.set(key, {
          name: c.local_body_name ?? "Unknown",
          type: c.local_body_type ?? "",
          count: 1,
        });
      }
    });
    return map;
  }, [customers]);

  // Get unique panchayaths for filter dropdown
  const panchayathOptions = useMemo(() => {
    const opts: { id: string; name: string; type: string }[] = [];
    const seen = new Set<string>();
    customers.forEach((c) => {
      if (c.local_body_id && !seen.has(c.local_body_id)) {
        seen.add(c.local_body_id);
        opts.push({ id: c.local_body_id, name: c.local_body_name ?? "Unknown", type: c.local_body_type ?? "" });
      }
    });
    return opts.sort((a, b) => a.name.localeCompare(b.name));
  }, [customers]);

  // Get ward options based on selected panchayath
  const wardOptions = useMemo(() => {
    const wards = new Set<number>();
    customers.forEach((c) => {
      if (c.ward_number != null) {
        if (filterPanchayath === "all" || c.local_body_id === filterPanchayath) {
          wards.add(c.ward_number);
        }
      }
    });
    return Array.from(wards).sort((a, b) => a - b);
  }, [customers, filterPanchayath]);

  // Filter customers
  const filtered = useMemo(() => {
    return customers.filter((c) => {
      if (filterPanchayath !== "all" && c.local_body_id !== filterPanchayath) return false;
      if (filterWard !== "all" && String(c.ward_number) !== filterWard) return false;
      return true;
    });
  }, [customers, filterPanchayath, filterWard]);

  // Top panchayaths by count
  const topPanchayaths = useMemo(() => {
    return Array.from(panchayathStats.entries())
      .filter(([key]) => key !== "__none")
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 8);
  }, [panchayathStats]);

  return (
    <div className="space-y-4">
      {/* Strength Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        <Card className="col-span-full sm:col-span-1">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Users className="h-4 w-4" /> Total Customers
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold">{customers.length}</p>
          </CardContent>
        </Card>
        {topPanchayaths.map(([key, val]) => (
          <Card key={key} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => { setFilterPanchayath(key); setFilterWard("all"); }}>
            <CardHeader className="pb-1 pt-3 px-3">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {val.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <p className="text-lg font-bold">{val.count}</p>
              <p className="text-[10px] text-muted-foreground">{val.type}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Panchayath:</span>
          <Select value={filterPanchayath} onValueChange={(v) => { setFilterPanchayath(v); setFilterWard("all"); }}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Panchayaths</SelectItem>
              {panchayathOptions.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name} ({p.type})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Ward:</span>
          <Select value={filterWard} onValueChange={setFilterWard}>
            <SelectTrigger className="w-32"><SelectValue placeholder="All" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Wards</SelectItem>
              {wardOptions.map((w) => (
                <SelectItem key={w} value={String(w)}>Ward {w}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {(filterPanchayath !== "all" || filterWard !== "all") && (
          <Badge variant="secondary" className="cursor-pointer" onClick={() => { setFilterPanchayath("all"); setFilterWard("all"); }}>
            Clear filters ✕
          </Badge>
        )}
        <Badge variant="outline" className="ml-auto">{filtered.length} customers</Badge>
      </div>

      {/* Table */}
      <div className="admin-table-wrap">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>District</TableHead>
              <TableHead>Panchayath</TableHead>
              <TableHead>Ward</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c, i) => (
              <TableRow key={c.id}>
                <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                <TableCell>{c.full_name ?? "—"}</TableCell>
                <TableCell>{c.mobile_number ?? "—"}</TableCell>
                <TableCell>{c.district_name ?? "—"}</TableCell>
                <TableCell>
                  {c.local_body_name ? (
                    <span>{c.local_body_name} <span className="text-xs text-muted-foreground">({c.local_body_type})</span></span>
                  ) : "—"}
                </TableCell>
                <TableCell>{c.ward_number ?? "—"}</TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No customers found</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default CustomerList;
