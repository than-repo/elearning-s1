type User = {
  role: String;
};

const u: User = {
  role: 'Admin',
};

const u2 = {
  role: 'Staff',
} satisfies User;
console.log(typeof u.role, typeof u2.role);
