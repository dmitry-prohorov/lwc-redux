// A fake backend so the examples can be deployed without Apex.
// In a real app replace these functions with imperative Apex calls, e.g.
// import getTodos from '@salesforce/apex/TodoController.getTodos';

const LATENCY = 400;

const CONTACTS = [
    'Ada Lovelace',
    'Alan Turing',
    'Barbara Liskov',
    'Donald Knuth',
    'Edsger Dijkstra',
    'Grace Hopper',
    'Katherine Johnson',
    'Linus Torvalds',
    'Margaret Hamilton',
    'Tim Berners-Lee'
].map((name, index) => ({ id: `c${index + 1}`, name }));

const TODOS = [
    { id: 't1', title: 'Install lwc-redux', completed: true },
    { id: 't2', title: 'Wrap the app in <c-redux-provider>', completed: true },
    { id: 't3', title: 'Connect a component with ReduxMixin', completed: false }
];

let nextTodoId = TODOS.length + 1;

const respond = (value) =>
    new Promise((resolve) => {
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(() => resolve(value), LATENCY);
    });

export const fetchTodos = () => respond(TODOS.map((todo) => ({ ...todo })));

export const createTodo = (title) => {
    if (!title || !title.trim()) {
        return Promise.reject(new Error('Title is required'));
    }
    return respond({ id: `t${nextTodoId++}`, title: title.trim(), completed: false });
};

export const searchContacts = (query) => {
    const term = (query || '').toLowerCase();
    return respond(CONTACTS.filter((contact) => contact.name.toLowerCase().includes(term)));
};
