// carefully rate and comment my random thought sort

// max-sort

// [29, 3, 6, 3, 8, 9, 7, 14, 17, 1, 4] 
// calculate bigger chunk first
// [29, 3, 6, 3, 8] [9, 7, 14, 17, 1, 4] 
// elect their smallest and largest out
// [3, 3, 1] | [6, 8], [9, 7, 14, 4] | [29, 17]
// keep splitting and find smallest and largest
// find mins and maxes, then split again

// important: basically, smallest and largest array **mind their own business** after split
// means that they have their own min and max and being to a new "group" (a term I made, a group only select their own min and max)
// here, we mark it as ||, indicating separate group, and | is for marking min and max specific array

// [1], [3, 3] || [6, 4]mi | [9, 7] | [8, 14]ma || [17], [29]
// !imp look one array is now dismantled
// as you can see if a group left only with array of 2 elements, it will be immediately sorted
// as you can see if a group left only with array of 2 elements, it will be immediately sorted
// [1] | [3] | [3] || [4] | [6] || [7] | [9] || [8] | [14] || [17] | [29] 
// now, important part, they are all array of 1, you now compare 2 and then put them back in place
// e.g. 1 < 3, 1; 3 = 3, 3 (left first); 3 < 4, 3 compare two two
// 1, 3, 3, 3, 6, 7, 8, 9, 14, 17, 29 sorted!

