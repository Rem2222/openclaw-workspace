def sort_users_by_age(users):
    """Sort list of users by age in ascending order."""
    return sorted(users, key=lambda user: user['age'])


import unittest


class TestSortUsersByAge(unittest.TestCase):
    def test_sort_by_age_ascending(self):
        users = [
            {'name': 'Alice', 'age': 30},
            {'name': 'Bob', 'age': 25},
            {'name': 'Charlie', 'age': 35}
        ]
        result = sort_users_by_age(users)
        expected = [
            {'name': 'Bob', 'age': 25},
            {'name': 'Alice', 'age': 30},
            {'name': 'Charlie', 'age': 35}
        ]
        self.assertEqual(result, expected)

    def test_empty_list(self):
        users = []
        result = sort_users_by_age(users)
        self.assertEqual(result, [])

    def test_single_user(self):
        users = [{'name': 'Alice', 'age': 30}]
        result = sort_users_by_age(users)
        self.assertEqual(result, [{'name': 'Alice', 'age': 30}])

    def test_same_age(self):
        users = [
            {'name': 'Alice', 'age': 30},
            {'name': 'Bob', 'age': 30}
        ]
        result = sort_users_by_age(users)
        self.assertEqual(result[0]['age'], 30)
        self.assertEqual(result[1]['age'], 30)


if __name__ == '__main__':
    unittest.main()
