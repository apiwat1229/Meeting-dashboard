import { useState } from "react";
import { Button, Chip, IconButton, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import { useAdminMutation, useDepartments, useUsers } from "@/api/hooks";
import * as store from "@/api/store";
import { FormDialog, type Field } from "@/components/FormDialog";
import type { DashboardUser, Department } from "@/types";

export function AdminUsers() {
  const { data: users = [] } = useUsers(); const { data: deps = [] } = useDepartments();
  const save = useAdminMutation(store.upsertUser, "users");
  const [edit, setEdit] = useState<Partial<DashboardUser> | null>(null);
  const fields: Field[] = [
    { name: "username", label: "ชื่อผู้ใช้", required: true }, { name: "displayName", label: "ชื่อที่แสดง", required: true },
    { name: "password", label: edit?.id ? "รหัสผ่านใหม่ (เว้นว่างเพื่อคงเดิม)" : "รหัสผ่าน", type: "password", required: !edit?.id },
    { name: "role", label: "บทบาท", type: "select", options: [{ value: "USER", label: "USER" }, { value: "ADMIN", label: "ADMIN" }] },
    { name: "departmentId", label: "แผนก", type: "select", options: deps.map((d) => ({ value: String(d.id), label: d.name })) },
    { name: "isActive", label: "เปิดใช้งาน", type: "checkbox" },
  ];
  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between"><Typography variant="h5">จัดการผู้ใช้</Typography><Button variant="contained" startIcon={<AddIcon />} onClick={() => setEdit({ role: "USER", isActive: true, departmentId: deps[0]?.id })}>เพิ่มผู้ใช้</Button></Stack>
      <Paper variant="outlined"><Table size="small"><TableHead><TableRow><TableCell>ผู้ใช้</TableCell><TableCell>ชื่อ</TableCell><TableCell>บทบาท</TableCell><TableCell>แผนก</TableCell><TableCell>สถานะ</TableCell><TableCell /></TableRow></TableHead>
        <TableBody>{users.map((u) => <TableRow key={u.id}><TableCell>{u.username}</TableCell><TableCell>{u.displayName}</TableCell><TableCell>{u.role}</TableCell>
          <TableCell>{deps.find((d) => d.id === u.departmentId)?.name}</TableCell><TableCell><Chip size="small" color={u.isActive ? "success" : "default"} label={u.isActive ? "ใช้งาน" : "ปิด"} /></TableCell>
          <TableCell align="right"><IconButton size="small" onClick={() => setEdit({ ...u, password: "" })}><EditIcon fontSize="small" /></IconButton></TableCell></TableRow>)}</TableBody></Table></Paper>
      {edit && <FormDialog open title={edit.id ? "แก้ไขผู้ใช้" : "เพิ่มผู้ใช้"} fields={fields} initial={{ ...edit, departmentId: String(edit.departmentId) }} onClose={() => setEdit(null)}
        onSubmit={(v) => { save.mutate({ ...v, id: edit.id, departmentId: Number(v.departmentId) } as DashboardUser); setEdit(null); }} />}
    </Stack>
  );
}

export function AdminDepartments() {
  const { data: deps = [] } = useDepartments();
  const save = useAdminMutation(store.upsertDepartment, "departments");
  const [edit, setEdit] = useState<Partial<Department> | null>(null);
  const fields: Field[] = [{ name: "code", label: "รหัส (เช่น IT)", required: true }, { name: "name", label: "ชื่อแผนก", required: true }, { name: "description", label: "รายละเอียด", type: "multiline" }, { name: "isActive", label: "เปิดใช้งาน", type: "checkbox" }];
  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between"><Typography variant="h5">จัดการแผนก</Typography><Button variant="contained" startIcon={<AddIcon />} onClick={() => setEdit({ isActive: true })}>เพิ่มแผนก</Button></Stack>
      <Paper variant="outlined"><Table size="small"><TableHead><TableRow><TableCell>รหัส</TableCell><TableCell>ชื่อ</TableCell><TableCell>รายละเอียด</TableCell><TableCell>สถานะ</TableCell><TableCell /></TableRow></TableHead>
        <TableBody>{deps.map((d) => <TableRow key={d.id}><TableCell>{d.code}</TableCell><TableCell>{d.name}</TableCell><TableCell>{d.description}</TableCell>
          <TableCell><Chip size="small" color={d.isActive ? "success" : "default"} label={d.isActive ? "ใช้งาน" : "ปิด"} /></TableCell>
          <TableCell align="right"><IconButton size="small" onClick={() => setEdit(d)}><EditIcon fontSize="small" /></IconButton></TableCell></TableRow>)}</TableBody></Table></Paper>
      {edit && <FormDialog open title={edit.id ? "แก้ไขแผนก" : "เพิ่มแผนก"} fields={fields} initial={edit} onClose={() => setEdit(null)} onSubmit={(v) => { save.mutate({ ...v, id: edit.id } as Department); setEdit(null); }} />}
    </Stack>
  );
}
