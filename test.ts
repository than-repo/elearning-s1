const userAndPosts = await prisma.user.create({
  data: {
    posts: {
      create: [
        { title: 'Prisma Day 2020' },
        { title: 'How to write a Prisma schema' },
      ],
    },
  },
});
