from app.core.search import search_products

# Let's try searching for a word that exists
print('Searching for "denim"...')
results1 = search_products("denim")
print(f"Results: {results1}")

# Let's test the fuzziness (typo tolerance) by misspelling "jacket" as "jackt"
print('\nSearching for typo "jackt"...')
results2 = search_products("jackt")
print(f"Results: {results2}")

# Let's try something that shouldn't exist
print('\nSearching for "shoes"...')
results3 = search_products("shoes")
print(f"Results: {results3}")
