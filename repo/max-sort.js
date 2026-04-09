// max-sort

// remember the basic principal of this is simple, go each round and always elect smallest and largest
// [29, 3, 6, 3, 8, 9, 7, 14, 17, 1, 4] 

// [1], [3, 6, 3, 8, 9, 7, 14, 17, 4], [29]
// [1, 3, 3], [6, 8, 9, 7, 14, 4], [17, 29]
// [1, 3, 3, 4], [6, 8, 9, 7], [14, 17, 29]
// [1, 3, 3, 4, 6], [8, 7], [9, 14, 17, 29]
// [1, 3, 3, 4, 6, 7], [8, 9, 14, 17, 29]
// merge, and then sorted!
// 
// to save space, we can change adding/shifting element to swapping in same array
